import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=(...parts)=>path.join(root,...parts);
// Vite builds the development HTML; deployment gets a compiled index.html.
await rename(at('dist/game.html'),at('dist/index.html'));
await cp(at('public'),at('dist/public'),{recursive:true});
await writeFile(at('dist/.nojekyll'),'');
const files=(await readdir(at('dist/assets'))).sort();
for(const file of files.filter(name=>name.endsWith('.js'))){
 const source=await readFile(at('dist/assets',file),'utf8');
 if(/(?:\bfrom\s*|\bimport\s*\()\s*['"]three(?:['"/])/.test(source)){
  throw new Error(`Unresolved Three.js import in ${file}`);
 }
}
// A ready-to-play entry is also committed for Pages "Deploy from a branch".
// Only files listed in our own manifest may be cleaned. Keep the previous
// generation so a cached play.html can still load its referenced scripts.
let prior={current:[],previous:[]};
try{prior=JSON.parse(await readFile(at('site-manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(at('assets'),{recursive:true});
for(const file of files)await cp(at('dist/assets',file),at('assets',file));
await cp(at('dist/index.html'),at('play.html'));
await writeFile(at('.nojekyll'),'');
const sameGeneration=JSON.stringify(files)===JSON.stringify(prior.current);
const previous=sameGeneration?prior.previous:prior.current;
const keep=new Set([...files,...previous]);
for(const file of new Set([...prior.current,...prior.previous])){
 if(path.basename(file)!==file)throw new Error('Invalid generated-site manifest');
 if(!keep.has(file))await rm(at('assets',file),{force:true});
}
await writeFile(at('site-manifest.json'),JSON.stringify({current:files,previous},null,2)+'\n');
console.log('Packaged dist/ for Actions and play.html + assets/ for branch publication.');
