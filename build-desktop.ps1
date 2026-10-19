param([string]$OutputDirectory='release/ModernFrontHD')
$ErrorActionPreference='Stop'
$runtimePath=Join-Path $PSScriptRoot '.tmp/electron-runtime'
$releaseRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'release')).TrimEnd([char[]]'\/')
if([string]::IsNullOrWhiteSpace($OutputDirectory)){throw 'OutputDirectory must name a directory inside the project release directory.'}
$requestedPath=if([System.IO.Path]::IsPathRooted($OutputDirectory)){$OutputDirectory}else{Join-Path $PSScriptRoot $OutputDirectory}
$destinationPath=[System.IO.Path]::GetFullPath($requestedPath).TrimEnd([char[]]'\/')
if(!$destinationPath.StartsWith($releaseRoot+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){
 throw 'OutputDirectory must stay strictly inside the project release directory.'
}
# Reject junctions/symlinks so a lexically contained destination cannot redirect writes outside release.
$checkedPath=$destinationPath
while($checkedPath.Length -ge $releaseRoot.Length){
 if(Test-Path -LiteralPath $checkedPath){
  $checkedItem=Get-Item -LiteralPath $checkedPath -Force
  if(!$checkedItem.PSIsContainer -or ($checkedItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)){
   throw 'OutputDirectory and its release ancestors must be ordinary directories, not files or reparse points.'
  }
 }
 if($checkedPath.Equals($releaseRoot,[System.StringComparison]::OrdinalIgnoreCase)){break}
 $checkedPath=[System.IO.Path]::GetDirectoryName($checkedPath)
}
if(!(Test-Path -LiteralPath (Join-Path $runtimePath 'electron.exe'))){throw 'Run the documented Electron runtime download first.'}
New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
Get-ChildItem -LiteralPath $runtimePath | Where-Object Name -ne 'electron.exe' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destinationPath -Recurse -Force }
$appPath=Join-Path $destinationPath 'resources/app'
New-Item -ItemType Directory -Force -Path $appPath | Out-Null
foreach($name in @('index.html','gallery.html','style.css','desktop.css','favicon.svg','src','assets','desktop','docs','README.md','LICENSE','THIRD_PARTY_NOTICES.md')){
 Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $appPath -Recurse -Force
}
$appVersion=(Get-Content -LiteralPath (Join-Path $PSScriptRoot 'package.json') -Raw | ConvertFrom-Json).version
@{name='modern-front-hd';version=$appVersion;main='desktop/main.cjs';private=$true} | ConvertTo-Json -Compress | Set-Content -LiteralPath (Join-Path $appPath 'package.json') -Encoding utf8
Copy-Item -LiteralPath (Join-Path $runtimePath 'electron.exe') -Destination (Join-Path $destinationPath 'ModernFrontHD.exe') -Force
$duplicateExe=Join-Path ([System.IO.Path]::GetFullPath($destinationPath)) 'electron.exe'
if(Test-Path -LiteralPath $duplicateExe){Remove-Item -LiteralPath $duplicateExe -Force}
Get-Item -LiteralPath (Join-Path $destinationPath 'ModernFrontHD.exe') | Select-Object FullName,Length
