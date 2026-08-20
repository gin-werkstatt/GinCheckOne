<?php
// Erlaubt der App, von einer anderen Adresse (z. B. lokal auf dem Handy oder
// einer anderen Domain) auf dieses Backend zuzugreifen. Die eigentliche
// Absicherung erfolgt über den Zugangscode (siehe auth.php), nicht über die
// Herkunft der Anfrage.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
