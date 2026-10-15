"""Run the installed CAD snapshot tool using a locally installed Chromium.
The plugin itself is unmodified. Avoid downloading a second browser revision."""
import sys,runpy
from pathlib import Path
from playwright.async_api import BrowserType
browser_root=Path.home()/'AppData/Local/ms-playwright'
executables=sorted(browser_root.glob('chromium-*/chrome-win64/chrome.exe'))
if not executables:raise SystemExit('No installed Chromium found')
original=BrowserType.launch
async def launch(self,*args,**kwargs):
    kwargs.setdefault('executable_path',str(executables[-1]))
    return await original(self,*args,**kwargs)
BrowserType.launch=launch
tool=Path.home()/'.codex/plugins/cache/text-to-cad/cad/0.2.0/skills/cad/scripts/snapshot'
sys.argv=[str(tool),*sys.argv[1:]]
runpy.run_path(str(tool),run_name='__main__')
