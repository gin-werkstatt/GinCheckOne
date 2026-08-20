<?php
// Zentraler Abgleichs-Endpunkt: nimmt lokale Änderungen (Rezepte, Batches,
// Löschungen) entgegen, schreibt sie in die Datenbank und liefert im
// Gegenzug alles zurück, was seit dem letzten Abgleich ("since") neuer ist.
// Fotos werden hier nur als Metadaten gelistet, die eigentlichen Bilddateien
// laufen über photo_upload.php / photo_download.php.

require __DIR__ . '/cors.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/db.php';

require_auth();
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Anfrage.']);
    exit;
}

$since = $input['since'] ?? null;
$pdo = get_pdo();
$nowIso = now_iso();
$nowDt = iso_to_mysql_dt($nowIso);

// Speichert einen Rezept- oder Batch-Datensatz, aber nur, wenn er neuer ist
// als eine eventuell bereits vorhandene Version ("letzter Stand gewinnt").
function upsert_entity(PDO $pdo, string $table, array $record): void {
    $id = $record['id'] ?? null;
    $updatedAt = $record['updatedAt'] ?? null;
    if (!$id || !$updatedAt) {
        return;
    }

    $updatedAtDt = iso_to_mysql_dt($updatedAt);
    $stmt = $pdo->prepare("SELECT updated_at FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetchColumn();
    if ($existing !== false && $existing >= $updatedAtDt) {
        return;
    }

    $data = json_encode($record, JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare(
        "INSERT INTO {$table} (id, data, updated_at, deleted_at) VALUES (?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), deleted_at = NULL"
    );
    $stmt->execute([$id, $data, $updatedAtDt]);
}

function mark_deleted(PDO $pdo, string $table, array $ids, string $nowDt): void {
    if (!$ids) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("UPDATE {$table} SET deleted_at = ?, updated_at = ? WHERE id IN ($placeholders)");
    $stmt->execute(array_merge([$nowDt, $nowDt], $ids));
}

$pdo->beginTransaction();
try {
    foreach ($input['recipes'] ?? [] as $recipe) {
        upsert_entity($pdo, 'recipes', $recipe);
    }
    foreach ($input['batches'] ?? [] as $batch) {
        upsert_entity($pdo, 'batches', $batch);
    }
    mark_deleted($pdo, 'recipes', $input['deletedRecipes'] ?? [], $nowDt);
    mark_deleted($pdo, 'batches', $input['deletedBatches'] ?? [], $nowDt);
    if (!empty($input['deletedPhotos'])) {
        $ids = $input['deletedPhotos'];
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare("UPDATE photos SET deleted_at = ? WHERE id IN ($placeholders)");
        $stmt->execute(array_merge([$nowDt], $ids));
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Sync fehlgeschlagen: ' . $e->getMessage()]);
    exit;
}

function fetch_changed(PDO $pdo, string $table, ?string $since): array {
    if ($since) {
        $stmt = $pdo->prepare("SELECT data FROM {$table} WHERE deleted_at IS NULL AND updated_at > ?");
        $stmt->execute([iso_to_mysql_dt($since)]);
    } else {
        $stmt = $pdo->query("SELECT data FROM {$table} WHERE deleted_at IS NULL");
    }
    return array_map(function ($row) {
        return json_decode($row['data'], true);
    }, $stmt->fetchAll());
}

function fetch_deleted_ids(PDO $pdo, string $table, ?string $since): array {
    if (!$since) {
        return [];
    }
    $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE deleted_at IS NOT NULL AND deleted_at > ?");
    $stmt->execute([iso_to_mysql_dt($since)]);
    return array_column($stmt->fetchAll(), 'id');
}

if ($since) {
    $photoStmt = $pdo->prepare(
        'SELECT id, batch_id, step_key, item_id, width, height, created_at FROM photos
         WHERE deleted_at IS NULL AND created_at > ?'
    );
    $photoStmt->execute([iso_to_mysql_dt($since)]);
} else {
    $photoStmt = $pdo->query(
        'SELECT id, batch_id, step_key, item_id, width, height, created_at FROM photos WHERE deleted_at IS NULL'
    );
}

$photos = array_map(function (array $row): array {
    return [
        'id' => $row['id'],
        'batchId' => $row['batch_id'],
        'stepKey' => $row['step_key'],
        'itemId' => $row['item_id'],
        'width' => $row['width'] !== null ? (int) $row['width'] : null,
        'height' => $row['height'] !== null ? (int) $row['height'] : null,
        'createdAt' => str_replace(' ', 'T', $row['created_at']) . 'Z',
    ];
}, $photoStmt->fetchAll());

echo json_encode([
    'serverTime' => $nowIso,
    'recipes' => fetch_changed($pdo, 'recipes', $since),
    'batches' => fetch_changed($pdo, 'batches', $since),
    'deletedRecipes' => fetch_deleted_ids($pdo, 'recipes', $since),
    'deletedBatches' => fetch_deleted_ids($pdo, 'batches', $since),
    'photos' => $photos,
    'deletedPhotos' => fetch_deleted_ids($pdo, 'photos', $since),
], JSON_UNESCAPED_UNICODE);
