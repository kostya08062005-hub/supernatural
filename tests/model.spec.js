import {test,expect} from '@playwright/test';
test('осмотр лица, поворот и полный рост доступны в меню',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/?graphics=basic');await page.getByRole('button',{name:'Рассмотреть Кастиэля ↗'}).click();
 await expect(page.getByRole('button',{name:'Лицо',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/castiel-face.png'});
 await page.locator('#model-turn').fill('45');
 await page.getByRole('button',{name:'В полный рост'}).click();await page.screenshot({path:'test-results/castiel-body.png'});
 await page.getByRole('button',{name:'Вернуться в меню'}).click();await expect(page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/})).toBeVisible();expect(errors).toEqual([]);
});
test('благодать выбирает только ближних демонов и испарение завершает распад',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/harness',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('/harness');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {EvaporationSystem}=await import('/src/evaporation.js');const {graceTargets}=await import('/src/combat.js');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101820);scene.add(new THREE.HemisphereLight(0xffffff,0x888888,2));
  const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(320,240);document.body.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(45,320/240,.1,100);camera.position.set(0,1.4,4);camera.lookAt(0,1,0);
  const enemies=[0,8,8.01].map(x=>{const e=new THREE.Group();e.position.x=x;const m=new THREE.Mesh(new THREE.BoxGeometry(.6,2,.3),new THREE.MeshStandardMaterial({color:0x857464}));m.position.y=1;e.add(m);scene.add(e);return e;});
  const targets=graceTargets(enemies,new THREE.Vector3());const ashes=new EvaporationSystem(scene);renderer.render(scene,camera);const before=renderer.domElement.toDataURL();
  targets.forEach(e=>ashes.start(e));ashes.update(.6);renderer.render(scene,camera);const during=renderer.domElement.toDataURL();
  const stillAlive=scene.children.includes(enemies[2]);const marked=targets.every(e=>e.userData.evaporating);const state=ashes.count;
  ashes.update(2.1);renderer.render(scene,camera);const after=renderer.domElement.toDataURL();
  const removed=targets.every(e=>!scene.children.includes(e));const result={targetCount:targets.length,stillAlive,marked,state,done:ashes.count,removed,changed:before!==during&&during!==after};ashes.clear();renderer.dispose();return result;
 });
 expect(result).toEqual({targetCount:2,stillAlive:true,marked:true,state:2,done:0,removed:true,changed:true});expect(errors).toEqual([]);
});
