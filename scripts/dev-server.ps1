# Einfacher lokaler Webserver zum Testen der App im Browser.
# Aufruf: powershell -File scripts\dev-server.ps1 [-Port 8080]
# Danach im Browser: http://localhost:8080/

param(
    [int]$Port = 8080
)

$root = Split-Path -Parent $PSScriptRoot

$mimeTypes = @{
    '.html'         = 'text/html; charset=utf-8'
    '.js'           = 'text/javascript; charset=utf-8'
    '.css'          = 'text/css; charset=utf-8'
    '.json'         = 'application/json; charset=utf-8'
    '.webmanifest'  = 'application/manifest+json; charset=utf-8'
    '.png'          = 'image/png'
    '.jpg'          = 'image/jpeg'
    '.jpeg'         = 'image/jpeg'
    '.ico'          = 'image/x-icon'
    '.svg'          = 'image/svg+xml'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Server laeuft: http://localhost:$Port/  (zum Beenden: Strg+C)"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
        if ($localPath -eq '/') { $localPath = '/index.html' }
        $filePath = Join-Path $root ($localPath.TrimStart('/'))

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - Nicht gefunden: $localPath")
            $response.ContentLength64 = $notFound.Length
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
