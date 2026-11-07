param(
  [string]$Version = "3.12.10",
  [string]$OutDir = "vendor\python"
)

$ErrorActionPreference = "Stop"

$url = "https://www.python.org/ftp/python/$Version/python-$Version-embed-amd64.zip"
$tmp = Join-Path $env:TEMP "python-embed-$Version.zip"

Write-Host "Descargando $url ..."
& curl.exe -L --fail --silent --show-error -o $tmp $url
if ($LASTEXITCODE -ne 0) { throw "Error al descargar Python embebido." }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Expand-Archive -LiteralPath $tmp -DestinationPath $OutDir -Force
Remove-Item -LiteralPath $tmp -Force

# Añade python-core (hermano de python en resources/) al sys.path del intérprete embebido.
$majorMinor = "python" + (($Version -split "\.")[0..1] -join "")
$pth = Join-Path $OutDir "$majorMinor._pth"
if (Test-Path -LiteralPath $pth) {
  $content = Get-Content -LiteralPath $pth -Raw
  if ($content -notmatch "python-core") {
    Add-Content -LiteralPath $pth -Value "..\python-core"
  }
} else {
  Write-Warning "No se encontró $pth; revisa el nombre del archivo ._pth para esta versión de Python."
}

Write-Host "Python embebido listo en $OutDir"
