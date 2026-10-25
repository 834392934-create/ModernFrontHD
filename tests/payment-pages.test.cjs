'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');

test('payment pages serve intact QR and all local links through the project server', {timeout:20000}, async t=>{
  const probe=net.createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,[path.join(root,'server.cjs'),String(port)],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
  t.after(()=>{if(child.exitCode===null)child.kill();});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Server did not start')),8000);
    child.once('error',e=>{clearTimeout(timer);reject(e);});
    child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited: '+code));});
    child.stdout.once('data',()=>{clearTimeout(timer);resolve();});
  });
  const base=`http://127.0.0.1:${port}`;
  for(const file of ['index.html','pay.html']){
    const url=base+'/docs/payment/'+file,res=await fetch(url);
    assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/html/);
    const text=await res.text();
    assert.match(text,/USD 3,000–60,000/);
    for(const [,href] of text.matchAll(/href="([^"]+)"/g)){
      const linked=new URL(href,url);if(linked.origin!==base)continue;
      const response=await fetch(linked);assert.equal(response.status,200,'Missing link '+href);await response.arrayBuffer();
    }
  }
  const qr=await fetch(base+'/docs/payment/alipay-collection.jpg');
  assert.equal(qr.headers.get('content-type'),'image/jpeg');
  const bytes=Buffer.from(await qr.arrayBuffer());
  assert.equal(bytes.length,218120);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'56e07e92fc85161b74fa587afe50f3b14236af8f781e5b676a2065ab99646e53');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'LICENSES/MIT-legacy.txt'))).digest('hex'),'abd10cbf1dfd1ea057d0af527f9720d2b337630bec573c7208e10d6859f68dc5');
});
