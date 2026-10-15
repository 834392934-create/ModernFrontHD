$ErrorActionPreference = 'Stop'
$releaseRoot = Join-Path $PSScriptRoot 'release'
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$names = @('index.html','gallery.html','style.css','favicon.svg','src','assets','docs','server.cjs','play.ps1','启动游戏.cmd','启动本地服务器.cmd','README.md','LICENSE','THIRD_PARTY_NOTICES.md')
$items = $names | ForEach-Object { Join-Path $PSScriptRoot $_ }
$archivePath = Join-Path $releaseRoot 'ModernFrontHD-portable.zip'
Compress-Archive -LiteralPath $items -DestinationPath $archivePath -Force
Get-Item -LiteralPath $archivePath | Select-Object FullName,Length
