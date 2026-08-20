<?php
// Baut eine PDO-Verbindung zur MySQL-Datenbank aus config.php auf.

function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $hostPart = $config['db']['host'];
    $port = null;
    if (strpos($hostPart, ':') !== false) {
        [$hostPart, $port] = explode(':', $hostPart, 2);
    }

    $dsn = 'mysql:host=' . $hostPart . ($port ? ';port=' . $port : '') . ';dbname=' . $config['db']['name'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $config['db']['user'], $config['db']['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

// Wandelt einen ISO-8601-Zeitstempel (wie ihn JavaScript erzeugt, z. B.
// "2026-08-20T14:03:11.123Z") in das MySQL-DATETIME(3)-Format um.
function iso_to_mysql_dt(string $iso): string {
    $dt = new DateTime($iso);
    return $dt->format('Y-m-d H:i:s.v');
}

// Erzeugt den aktuellen Zeitpunkt im gleichen ISO-8601-Format, das die App
// verwendet (new Date().toISOString()), damit Client und Server dieselben
// Zeitstempel vergleichen können.
function now_iso(): string {
    return (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
}
