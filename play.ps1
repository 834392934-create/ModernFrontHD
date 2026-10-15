$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$nodeTool = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeTool) { Start-Process -FilePath (Join-Path $gameRoot 'index.html'); exit }
New-Item -ItemType Directory -Path (Join-Path $gameRoot '.tmp') -Force | Out-Null
foreach ($gamePort in 8765..8775) {
    $gameUrl = "http://127.0.0.1:$gamePort"
    try {
        $health = Invoke-RestMethod -Uri "$gameUrl/health" -TimeoutSec 1
        if ($health.app -eq 'modern-front-hd') { Start-Process -FilePath $gameUrl; exit }
        continue
    } catch {
        $portOccupied = Get-NetTCPConnection -LocalPort $gamePort -State Listen -ErrorAction SilentlyContinue
        if ($portOccupied) { continue }
    }
    $serverPath = Join-Path $gameRoot 'server.cjs'
    $serverArgs = '"' + $serverPath + '" ' + $gamePort
    $process = Start-Process -FilePath $nodeTool.Source -ArgumentList $serverArgs -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $gameRoot ".tmp/server-$gamePort.log") -RedirectStandardError (Join-Path $gameRoot ".tmp/server-$gamePort.error.log")
    for ($attempt=0; $attempt -lt 12; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            $health = Invoke-RestMethod -Uri "$gameUrl/health" -TimeoutSec 1
            if ($health.app -eq 'modern-front-hd') { Start-Process -FilePath $gameUrl; exit }
        } catch { if ($process.HasExited) { break } }
    }
}
Start-Process -FilePath (Join-Path $gameRoot 'index.html')
