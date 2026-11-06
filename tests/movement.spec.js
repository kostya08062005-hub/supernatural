import {test,expect} from '@playwright/test';
async function harness(page){await page.route('**/harness',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('/harness');}
test('прыжок, перекат, телепорт и камера соблюдают ограничения',async({page})=>{
 await harness(page);const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const {HeroMotion}=await import('/src/hero-motion.js');const player=new THREE.Group(),keys=new Set(),effects=[];
  const motion=new HeroMotion(player,keys,(x,z)=>Math.abs(x)<44&&Math.abs(z)<43,p=>effects.push(p.clone()));motion.yaw=0;
  const jumped=motion.jump();const secondJump=motion.jump();let peak=0;for(let i=0;i<100;i++){motion.update(.016,true);peak=Math.max(peak,player.position.y);}const landed=motion.grounded&&player.position.y===0;
  player.position.set(0,0,0);const teleported=motion.teleport(),distance=player.position.length(),repeat=motion.teleport();
  motion.reset();player.position.set(0,0,0);motion.yaw=0;motion.canMove=(x,z)=>z>-.9;const rolled=motion.dodge();let protectedDuringRoll=motion.invulnerable>0;for(let i=0;i<50;i++)motion.update(.016);const wall=player.position.z>-.9,finished=!motion.roll&&motion.visual.quaternion.angleTo(new THREE.Quaternion())<.0001;
  motion.reset();player.position.set(0,0,0);motion.canMove=()=>false;const blockedTeleport=!motion.teleport()&&motion.teleportCD===0;
  const old=motion.yaw;motion.look(70,1000);motion.update(.01);const followed=motion.yaw!==old&&Math.abs(player.rotation.y-motion.yaw-Math.PI)<.0001;
  return {jumped,secondJump,peak,landed,teleported,distance,repeat,effects:effects.length,rolled,protectedDuringRoll,wall,finished,blockedTeleport,followed,pitch:motion.pitch};
 });
 expect(result).toMatchObject({jumped:true,secondJump:false,landed:true,teleported:true,repeat:false,effects:2,rolled:true,protectedDuringRoll:true,wall:true,finished:true,blockedTeleport:true,followed:true});expect(result.peak).toBeGreaterThan(.9);expect(result.peak).toBeLessThan(1.3);expect(result.distance).toBeCloseTo(10);expect(result.pitch).toBeLessThanOrEqual(.9);
});
test('демон выходит дымом, возвращается в тело и поддаётся удержанию',async({page})=>{
 await harness(page);const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const {DemonBehavior,holdTarget}=await import('/src/demon-behavior.js');const ai=new DemonBehavior((x,z)=>Math.abs(x)<40&&Math.abs(z)<40);const world=new THREE.Group(),enemy=new THREE.Group();enemy.add(new THREE.Mesh(new THREE.BoxGeometry(.6,2,.3),new THREE.MeshStandardMaterial()));enemy.position.set(0,0,-15);world.add(enemy);ai.register(enemy);
  const escaped=ai.update(enemy,7.1,new THREE.Vector3())==='smoke',host=ai.hosts.length===1,smokeCannotHold=!ai.hold(enemy);ai.update(enemy,2.4,new THREE.Vector3());const returned=!enemy.userData.smoke&&enemy.position.y===0;const held=ai.hold(enemy);ai.update(enemy,.1,new THREE.Vector3());const levitated=enemy.position.y>0;ai.update(enemy,6,new THREE.Vector3());const released=enemy.userData.held===0&&enemy.position.y===0;ai.updateAmbient(6.1);const hostGone=ai.hosts.length===0;
  enemy.position.set(0,0,-6);const behind=enemy.clone();behind.position.set(0,0,2);const aimed=holdTarget([behind,enemy],new THREE.Vector3(),new THREE.Vector3(0,0,-1))===enemy;
  ai.clear();return {escaped,host,smokeCannotHold,returned,held,levitated,released,hostGone,aimed};
 });expect(Object.values(result).every(Boolean)).toBe(true);
});
test('новые действия доступны с клавиатуры в игре',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?graphics=basic');await page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/}).click();
 await page.keyboard.press('Space');await expect(page.locator('#movement-state')).toHaveText('Прыжок');await expect(page.locator('#movement-state')).toHaveText('На земле',{timeout:15000});
 await page.keyboard.press('c');await expect(page.locator('#movement-state')).toHaveText('Перекат');await expect(page.locator('#movement-state')).toHaveText('На земле',{timeout:15000});
 await page.keyboard.press('r');await expect(page.locator('#teleport-status')).toContainText('Восстановление');await expect(page.locator('#hold-status')).toBeVisible();expect(errors).toEqual([]);
});
