$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$exe = Join-Path $projectRoot "release/ModernFrontHD-$version/ModernFrontHD.exe"
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$shortcut = Join-Path $desktop (((Split-Path $projectRoot -Leaf) -replace 'HD$', ' HD') + '.lnk')
$link = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcut)
if ($link.TargetPath -ne $exe) { throw 'Desktop shortcut points to a different release.' }
$entries = @(Get-ChildItem -LiteralPath $projectRoot -Filter '*.cmd' | Where-Object { [IO.File]::ReadAllText($_.FullName).Contains('ModernFrontHD-') }) + @(Get-Item -LiteralPath $shortcut)
$results = @()
$oldProfile = $env:MODERN_FRONT_TEST_PROFILE
try {
    foreach ($entry in $entries) {
        $profile = Join-Path $projectRoot ('.tmp/launcher-' + [Guid]::NewGuid().ToString('N'))
        $env:MODERN_FRONT_TEST_PROFILE = $profile
        $owned = $null
        try {
            if ($entry.Extension -eq '.cmd') {
                $batch = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d','/c',('"' + $entry.FullName + '"')) -WorkingDirectory $desktop -WindowStyle Hidden -PassThru
            } else {
                # Visible window is the subject of this real shortcut test.
                Start-Process -FilePath $entry.FullName -WorkingDirectory $desktop
            }
            $deadline = [DateTime]::UtcNow.AddSeconds(25)
            do {
                Start-Sleep -Milliseconds 300
                $child = Get-CimInstance Win32_Process -Filter "Name='ModernFrontHD.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) } | Select-Object -First 1
                if ($child) {
                    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($child.ParentProcessId)"
                    if ($parent.ExecutablePath -eq $exe -and $parent.CommandLine -notmatch '--type=') { $owned = Get-Process -Id $parent.ProcessId -ErrorAction SilentlyContinue }
                }
                if ($owned) { $owned.Refresh() }
            } until (($owned -and $owned.MainWindowHandle -ne 0 -and $owned.MainWindowTitle) -or [DateTime]::UtcNow -gt $deadline)
            if (!$owned -or !$owned.MainWindowHandle -or !$owned.Responding) { throw "Launcher did not create a responsive game window: $($entry.Name)" }
            $results += [pscustomobject]@{ entry=$entry.Name; pid=$owned.Id; title=$owned.MainWindowTitle; responsive=$owned.Responding; version=$version; executable=$exe; isolatedProfile=$true }
        } finally {
            # Only the process verified through this unique test profile is closed.
            if ($owned -and !$owned.HasExited) {
                [void]$owned.CloseMainWindow()
                if (!$owned.WaitForExit(6000)) { $owned.Kill(); $owned.WaitForExit(3000) | Out-Null }
            }
        }
    }
} finally { $env:MODERN_FRONT_TEST_PROFILE = $oldProfile }
$report = [pscustomobject]@{ recordedAt=[DateTime]::UtcNow.ToString('o'); version=$version; passed=$true; entries=$results }
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $projectRoot 'docs/launcher-desktop-report.json') -Encoding UTF8
$report | ConvertTo-Json -Depth 5
