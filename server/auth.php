<?php
// Prüft den Zugangscode, den die App bei jeder Anfrage im Header
// "X-Api-Token" mitschickt, gegen den in config.php hinterlegten Wert.

function require_auth(): void {
    $config = require __DIR__ . '/config.php';
    $headers = function_exists('getallheaders') ? getallheaders() : [];

    $token = '';
    foreach ($headers as $name => $value) {
        if (strtolower($name) === 'x-api-token') {
            $token = $value;
            break;
        }
    }
    if ($token === '' && isset($_SERVER['HTTP_X_API_TOKEN'])) {
        $token = $_SERVER['HTTP_X_API_TOKEN'];
    }

    if ($token === '' || !hash_equals((string) $config['api_token'], (string) $token)) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Ungültiger oder fehlender Zugangscode.']);
        exit;
    }
}
