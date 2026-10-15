const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../assets/textures');
const data={diffuse:'data:image/jpeg;base64,'+fs.readFileSync(path.join(dir,'forest-ground-diffuse.jpg')).toString('base64'),normal:'data:image/jpeg;base64,'+fs.readFileSync(path.join(dir,'forest-ground-normal.jpg')).toString('base64')};
fs.writeFileSync(path.join(dir,'ground-data.js'),'globalThis.GroundTextures='+JSON.stringify(data)+';\n');
console.log('Embedded CC0 ground textures for offline file:// loading.');
