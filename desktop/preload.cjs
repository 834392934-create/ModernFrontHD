const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('DesktopGame',{fullscreen:()=>ipcRenderer.invoke('modern-front:fullscreen'),isFullscreen:()=>ipcRenderer.invoke('modern-front:fullscreen-state'),close:()=>ipcRenderer.send('modern-front:close'),minimize:()=>ipcRenderer.send('modern-front:minimize'),version:'2.0.0'});
