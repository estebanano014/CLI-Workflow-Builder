# Descarga y extrae el binario portable de Ollama para empaquetarlo con la app.
# Equivalente a `scripts/fetch-python.ps1` pero para Ollama.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root "vendor"
$zip = Join-Path $vendor "ollama-windows-amd64.zip"
$dest = Join-Path $vendor "ollama"
$url = "https://ollama.com/download/ollama-windows-amd64.zip"

New-Item -ItemType Directory -Force -Path $vendor | Out-Null

Write-Host "Descargando Ollama (Windows amd64)..."
curl.exe -L --retry 3 -o $zip $url
if ($LASTEXITCODE -ne 0) { throw "No se pudo descargar Ollama desde $url" }

Write-Host "Extrayendo a $dest ..."
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
tar -xf $zip -C $dest
if ($LASTEXITCODE -ne 0) { throw "No se pudo extraer $zip" }

Write-Host "Ollama listo en $dest"
