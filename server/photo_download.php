<?php
// Liefert ein einzelnes Foto als JPEG aus. Zugriff nur mit gültigem
// Zugangscode, damit Fotos nicht über eine erratene URL abgreifbar sind.

require __DIR__ . '/cors.php';
require __DIR__ . '/auth.php';

require_auth();

$id = $_GET['id'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id)) {
    http_response_code(400);
    exit;
}

$path = __DIR__ . '/uploads/' . $id . '.jpg';
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($path));
readfile($path);
