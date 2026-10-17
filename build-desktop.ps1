$ErrorActionPreference='Stop'
$runtimePath=Join-Path $PSScriptRoot '.tmp/electron-runtime'
$destinationPath=Join-Path $PSScriptRoot 'release/ModernFrontHD'
if(!(Test-Path -LiteralPath (Join-Path $runtimePath 'electron.exe'))){throw 'Run the documented Electron runtime download first.'}
New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
Get-ChildItem -LiteralPath $runtimePath | Where-Object Name -ne 'electron.exe' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destinationPath -Recurse -Force }
$appPath=Join-Path $destinationPath 'resources/app'
New-Item -ItemType Directory -Force -Path $appPath | Out-Null
foreach($name in @('index.html','gallery.html','style.css','desktop.css','favicon.svg','src','assets','desktop','docs','README.md','LICENSE','THIRD_PARTY_NOTICES.md')){
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $appPath -Recurse -Force
}
'{"name":"modern-front-hd","version":"3.3.0","main":"desktop/main.cjs","private":true}' | Set-Content -LiteralPath (Join-Path $appPath 'package.json') -Encoding utf8
Copy-Item -LiteralPath (Join-Path $runtimePath 'electron.exe') -Destination (Join-Path $destinationPath 'ModernFrontHD.exe') -Force
$duplicateExe=Join-Path ([System.IO.Path]::GetFullPath($destinationPath)) 'electron.exe'
if(Test-Path -LiteralPath $duplicateExe){Remove-Item -LiteralPath $duplicateExe -Force}
Get-Item -LiteralPath (Join-Path $destinationPath 'ModernFrontHD.exe') | Select-Object FullName,Length
