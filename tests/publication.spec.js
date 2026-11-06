import {test,expect} from '@playwright/test';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const repo=process.cwd();let server;let origin;
test.beforeAll(async()=>{
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');const branch=url.pathname.startsWith('/branch/supernatural/');const prefix=branch?'/branch/supernatural/':'/artifact/supernatural/';
  if(!url.pathname.startsWith(prefix))throw Error('unknown route');
  const root=branch?repo:path.join(repo,'dist');const file=path.resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(root+path.sep))throw Error('outside root');
  const data=await readFile(file);res.setHeader('Content-Length',data.length);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);
 }catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
for(const mode of ['branch','artifact'])test(`публикация ${mode}: готовые модули и Ironvex загружаются`,async({page})=>{
 test.setTimeout(120000);const errors=[];const requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(`${origin}/${mode}/supernatural/?graphics=basic`);
 if(mode==='branch')await expect(page).toHaveURL(/\/play\.html\?graphics=basic$/);
 await expect(page.locator('#select-castiel')).toHaveAttribute('aria-pressed','true');await page.locator('#select-ironvex').click();await expect(page.locator('#select-ironvex')).toHaveAttribute('aria-pressed','true',{timeout:60000});
 await page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/}).click();await expect(page.locator('.hud-title')).toHaveText('Ironvex');await expect(page.locator('#punch-state')).toBeVisible();
 expect(requests.some(url=>url.includes('/public/models/ironvex.glb'))).toBe(true);expect(requests.some(url=>url.includes('/public/models/ironvex-skin.bin'))).toBe(true);expect(requests.some(url=>url.includes('/src/')||url.includes('/node_modules/'))).toBe(false);expect(errors).toEqual([]);
});
