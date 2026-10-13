param([switch]$SetupOnly, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$serverProcess = $null
try {
    # Portable runtime: no administrator rights, PATH changes or system install.
    $nodeVersion = '22.23.3'
    $machineArch = $env:PROCESSOR_ARCHITEW6432
    if (-not $machineArch) { $machineArch = $env:PROCESSOR_ARCHITECTURE }
    switch ($machineArch.ToUpperInvariant()) {
        'AMD64' { $nodeArch = 'x64'; $zipHash = '2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71'; $exeHash = '9c9245166b4a8e182e0b797da9c20136117ff24368eaff1fec8343a123c8db0e' }
        'ARM64' { $nodeArch = 'arm64'; $zipHash = '33dad22e4cef5ee8f9fbb1b0d037fdacd0e56d12a4580f0d63f68b894deab535'; $exeHash = 'b5a3165ec6f24c0b1fe2a10fed58e03f6c1d7d141beb3b225ff030ceac6c5eb5' }
        'X86' { $nodeArch = 'x86'; $zipHash = '1e07ac00e61b41b7ecf242de8e38883d237d5ad3fdcad7c16f2dd3a88670e2b6'; $exeHash = 'a8aa72dda43af5357d0a502548a54e402d4f7643be221662624a2cc876cd37bb' }
        default { throw "Unsupported Windows architecture: $machineArch" }
    }
    $runtimeRoot = Join-Path $projectRoot '.runtime'
    $runtimeName = "node-v$nodeVersion-win-$nodeArch"
    $runtimePath = Join-Path $runtimeRoot $runtimeName
    $nodePath = Join-Path $runtimePath 'node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) {
        Write-Host "Preparing Node.js $nodeVersion ($nodeArch). Internet is needed only for this first setup."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
        $downloadPath = Join-Path $runtimeRoot ([guid]::NewGuid().ToString() + '.zip')
        $stagingPath = Join-Path $runtimeRoot ([guid]::NewGuid().ToString())
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$nodeVersion/$runtimeName.zip" -OutFile $downloadPath
            if ((Get-FileHash -LiteralPath $downloadPath -Algorithm SHA256).Hash -ne $zipHash) { throw 'Node.js download checksum mismatch. Nothing will be executed.' }
            Expand-Archive -LiteralPath $downloadPath -DestinationPath $stagingPath
            $extractedPath = Join-Path $stagingPath $runtimeName
            # Keep the official license beside the portable runtime.
            New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $extractedPath 'LICENSE') -Destination $runtimePath
            Copy-Item -LiteralPath (Join-Path $extractedPath 'node.exe') -Destination $nodePath
        } finally {
            if (Test-Path -LiteralPath $downloadPath) { Remove-Item -LiteralPath $downloadPath -Force }
            if (Test-Path -LiteralPath $stagingPath) {
                $resolvedStage = [IO.Path]::GetFullPath($stagingPath)
                if (-not $resolvedStage.StartsWith([IO.Path]::GetFullPath($runtimeRoot) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid staging directory.' }
                Remove-Item -LiteralPath $resolvedStage -Recurse -Force
            }
        }
    }
    if ((Get-FileHash -LiteralPath $nodePath -Algorithm SHA256).Hash -ne $exeHash) { throw 'Cached Node.js checksum mismatch. Remove .runtime and try again.' }
    if ($SetupOnly) { Write-Host "Node.js is ready: $nodePath"; exit 0 }
    $serverPort = 4310
    if ($env:PORT -and (-not [int]::TryParse($env:PORT, [ref]$serverPort))) { throw 'PORT must be an integer.' }
    if ($serverPort -lt 1 -or $serverPort -gt 65535) { throw 'PORT must be between 1 and 65535.' }
    $browserUrl = "http://localhost:$serverPort"
    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $nodePath
    $processInfo.Arguments = '"' + (Join-Path $projectRoot 'server.mjs') + '"'
    $processInfo.WorkingDirectory = $projectRoot
    $processInfo.UseShellExecute = $false
    $serverProcess = [Diagnostics.Process]::Start($processInfo)
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        if ($serverProcess.HasExited) { throw 'Server could not start. Check the message above; the port may already be in use.' }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$serverPort/api/info" -TimeoutSec 3
            if ($response.StatusCode -eq 200 -and ($response.Content | ConvertFrom-Json).name -eq 'proFILEr') { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) { throw 'Server did not become ready. Check HOST and PORT settings.' }
    if (-not $NoBrowser) { Start-Process $browserUrl -WindowStyle Hidden }
    Write-Host "proFILEr is running at $browserUrl. Keep this window open. Press Ctrl+C to stop."
    $serverProcess.WaitForExit()
    exit $serverProcess.ExitCode
} catch {
    Write-Host "proFILEr: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Check your internet connection and folder permissions, then run start.bat again.'
    exit 1
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) { $serverProcess.Kill(); $serverProcess.WaitForExit() }
}
