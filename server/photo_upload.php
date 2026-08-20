<?php
// Nimmt ein einzelnes Foto entgegen (multipart/form-data) und speichert es
// als Datei im uploads/-Ordner sowie seine Metadaten in der Datenbank.

require __DIR__ . '/cors.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/db.php';

require_auth();
header('Content-Type: application/json; charset=utf-8');

$id = $_POST['id'] ?? '';
$batchId = $_POST['batchId'] ?? '';
$stepKey = $_POST['stepKey'] ?? '';
$itemId = $_POST['itemId'] ?? '';
$width = isset($_POST['width']) && $_POST['width'] !== '' ? (int) $_POST['width'] : null;
$height = isset($_POST['height']) && $_POST['height'] !== '' ? (int) $_POST['height'] : null;
$createdAt = $_POST['createdAt'] ?? '';

if ($id === '' || $batchId === '' || $createdAt === '' || !isset($_FILES['photo'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Fehlende Angaben.']);
    exit;
}

// ID wird als Dateiname verwendet - nur unbedenkliche Zeichen zulassen.
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige Foto-ID.']);
    exit;
}

$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$target = $uploadDir . '/' . $id . '.jpg';
if (!move_uploaded_file($_FILES['photo']['tmp_name'], $target)) {
    http_response_code(500);
    echo json_encode(['error' => 'Foto konnte nicht gespeichert werden.']);
    exit;
}

$pdo = get_pdo();
$createdAtDt = iso_to_mysql_dt($createdAt);
$stmt = $pdo->prepare(
    'INSERT INTO photos (id, batch_id, step_key, item_id, width, height, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), step_key = VALUES(step_key),
       item_id = VALUES(item_id), width = VALUES(width), height = VALUES(height),
       created_at = VALUES(created_at), deleted_at = NULL'
);
$stmt->execute([$id, $batchId, $stepKey ?: null, $itemId !== '' ? $itemId : null, $width, $height, $createdAtDt]);

echo json_encode(['ok' => true]);
