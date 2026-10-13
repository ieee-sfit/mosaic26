# Tiny static file server for the kiosk build. Needs nothing installed: PowerShell ships with Windows.
param(
  [int]$Port = 8080,
  [string]$Root = (Join-Path $PSScriptRoot 'dist-kiosk')
)
$Root = [IO.Path]::GetFullPath($Root)
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript'; '.mjs' = 'text/javascript'; '.css' = 'text/css'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'; '.mp4' = 'video/mp4'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ico' = 'image/x-icon'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "MOSAIC kiosk serving $Root on http://localhost:$Port/ (close this window to stop)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $Root $rel))
    if (-not $file.StartsWith($Root) -or -not (Test-Path $file -PathType Leaf)) { $file = Join-Path $Root 'index.html' }
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.OutputStream.Close()
  }
}
