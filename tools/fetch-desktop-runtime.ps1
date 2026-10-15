$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$runtimeVersion='44.7.2'
$baseUrl="https://github.com/electron/electron/releases/download/v$runtimeVersion"
$archiveName="electron-v$runtimeVersion-win32-x64.zip"
$cachePath=Join-Path $projectRoot '.tmp'
New-Item -ItemType Directory -Force -Path $cachePath | Out-Null
$archivePath=Join-Path $cachePath $archiveName
$checksums=(Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -UseBasicParsing).Content
$expected=($checksums -split "`n" | Where-Object {$_ -match ([regex]::Escape($archiveName)+'\s*$')}) -replace '\s+.*$',''
if($expected -notmatch '^[a-fA-F0-9]{64}$'){throw 'Official checksum entry missing or ambiguous.'}
if(!(Test-Path -LiteralPath $archivePath)){Invoke-WebRequest -Uri "$baseUrl/$archiveName" -OutFile $archivePath -UseBasicParsing}
$actual=(Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
if($actual -ne $expected){throw "Electron checksum mismatch: $archivePath. Runtime was not executed or extracted."}
$runtimePath=Join-Path $cachePath 'electron-runtime'
Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimePath -Force
Write-Output "Verified Electron $runtimeVersion SHA256 $actual. Run build-desktop.ps1 next."
