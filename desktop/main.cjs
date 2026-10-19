const {app,BrowserWindow,ipcMain,shell,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
// Native acceptance runs use a separate profile so tests cannot overwrite the
// player's saves or settings while another copy of the game remains open.
if(process.env.MODERN_FRONT_TEST_PROFILE){
 const testProfile=path.resolve(process.env.MODERN_FRONT_TEST_PROFILE);
 fs.mkdirSync(testProfile,{recursive:true});app.setPath('userData',testProfile);
}
app.setName('现代战线 HD');
const root=path.resolve(__dirname,'..');
const windowed=process.argv.includes('--windowed');
let main;
function makeWindow(file,fullscreen=false){
 const win=new BrowserWindow({title:'现代战线 HD',width:1600,height:1000,minWidth:960,minHeight:640,backgroundColor:'#172229',frame:!fullscreen,fullscreen,show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:true}});
 win.removeMenu();win.loadFile(path.join(root,file));win.once('ready-to-show',()=>win.show());
 win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('file:')&&new URL(url).pathname.endsWith('/gallery.html'))makeWindow('gallery.html');else if(/^https:\/\//.test(url))shell.openExternal(url);return{action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file:'))event.preventDefault();});
 win.webContents.on('render-process-gone',(_e,detail)=>{fs.appendFileSync(path.join(app.getPath('userData'),'crash.log'),new Date().toISOString()+' '+JSON.stringify(detail)+'\n');});
 return win;
}
app.whenReady().then(()=>{
 Menu.setApplicationMenu(null);main=makeWindow('index.html',!windowed);
 ipcMain.handle('modern-front:fullscreen',(event)=>{const w=BrowserWindow.fromWebContents(event.sender);w.setFullScreen(!w.isFullScreen());return w.isFullScreen();});
 ipcMain.handle('modern-front:fullscreen-state',event=>BrowserWindow.fromWebContents(event.sender).isFullScreen());
 ipcMain.on('modern-front:close',event=>BrowserWindow.fromWebContents(event.sender)?.close());
 ipcMain.on('modern-front:minimize',event=>BrowserWindow.fromWebContents(event.sender)?.minimize());
});
app.on('window-all-closed',()=>app.quit());
