$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
node (Join-Path $projectRoot 'scripts/package-release.mjs') --platform windows
if ($LASTEXITCODE -ne 0) { throw 'Release packaging failed.' }
