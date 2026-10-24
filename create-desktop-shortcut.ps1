$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$exe = Join-Path $projectRoot "release/ModernFrontHD-$version/ModernFrontHD.exe"
if (!(Test-Path -LiteralPath $exe -PathType Leaf)) {
    throw "Desktop build is missing: $exe"
}
$desktopPath = [Environment]::GetFolderPath('DesktopDirectory')
$displayName = (Split-Path $projectRoot -Leaf) -replace 'HD$', ' HD'
$shortcutPath = Join-Path $desktopPath ($displayName + '.lnk')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = Split-Path $exe -Parent
$shortcut.IconLocation = "$exe,0"
$shortcut.Description = "Modern Front HD $version - offline fullscreen game"
$shortcut.WindowStyle = 1
$shortcut.Save()
[pscustomobject]@{ Shortcut = $shortcutPath; Target = $shortcut.TargetPath; Version = $version } | ConvertTo-Json
