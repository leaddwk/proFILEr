$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$distRoot = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
$archivePath = Join-Path $distRoot "proFILEr-v$version-windows.zip"
# Explicit allowlist: never package shared files, records, credentials or cached runtimes.
$sourcePaths = @('README.md', 'QUICKSTART.md', 'package.json', 'server.mjs', 'start.bat', 'scripts/start-windows.ps1', 'public/app.js', 'public/favicon.svg', 'public/index.html', 'public/logo.svg', 'public/sort.mjs', 'public/style.css')
Add-Type -AssemblyName System.IO.Compression
$archiveStream = [IO.File]::Open($archivePath, [IO.FileMode]::Create)
$archiveZip = [IO.Compression.ZipArchive]::new($archiveStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($sourcePath in $sourcePaths) {
        $entryStream = $archiveZip.CreateEntry('proFILEr/' + $sourcePath).Open()
        try { $bytes = [IO.File]::ReadAllBytes((Join-Path $projectRoot $sourcePath)); $entryStream.Write($bytes, 0, $bytes.Length) } finally { $entryStream.Dispose() }
    }
} finally { $archiveZip.Dispose(); $archiveStream.Dispose() }
$checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($archivePath + '.sha256', "$checksum  $([IO.Path]::GetFileName($archivePath))`n")
Write-Host $archivePath
