<?php
// Vorlage für die Server-Konfiguration.
// Kopiere diese Datei zu "config.php" (liegt bereits als Kopie da) und trage
// dort deine echten Zugangsdaten ein. "config.php" wird nicht ins Git-Repo
// übernommen (siehe .gitignore).

return [
    // Zugangsdaten der MySQL-Datenbank, die du in phpMyAdmin bei Netcup
    // angelegt hast.
    'db' => [
        'host' => 'localhost',
        'name' => 'DEIN_DATENBANKNAME',
        'user' => 'DEIN_DB_BENUTZER',
        'password' => 'DEIN_DB_PASSWORT',
    ],

    // Frei gewähltes, sicheres Passwort (z. B. langer Zufallsstring), das die
    // App bei jeder Synchronisierung mitschickt. Muss auf allen Geräten in
    // der App eingetragen werden, mit denen du synchronisieren willst.
    'api_token' => 'HIER_EIN_SICHERES_TOKEN_EINTRAGEN',
];
