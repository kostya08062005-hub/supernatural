import {test,expect} from '@playwright/test';
import * as THREE from 'three';
import {PunchCombat} from '../src/punch-combat.js';

function enemy(z,x=0){const e=new THREE.Group();e.position.set(x,0,z);e.userData.hp=100;return e;}
test('удары попадают после замаха, один раз, и имеют разный урон',()=>{
 const hits=[],target=enemy(2);const combat=new PunchCombat((e,damage)=>hits.push(damage));const p=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1);
 expect(combat.start('left')).toBe(true);expect(combat.start('right')).toBe(false);combat.update(.25,[target],p,forward);expect(hits).toEqual([]);combat.update(.02,[target],p,forward);expect(hits).toEqual([35]);combat.update(.1,[target],p,forward);expect(hits).toEqual([35]);combat.update(.3,[target],p,forward);expect(combat.attack).toBeNull();
 expect(combat.start('right')).toBe(true);combat.update(.44,[target],p,forward);expect(hits).toEqual([35,65]);combat.update(.6,[target],p,forward);expect(hits).toHaveLength(2);
});
test('удары не задевают дальнего, заднего, дымового и закрытого стеной демона',()=>{
 const hits=[],behind=enemy(-1),far=enemy(4),smoke=enemy(1),wall=enemy(2),visible=enemy(2.1);smoke.userData.smoke={};const combat=new PunchCombat(e=>hits.push(e),(p,e)=>e!==wall.position);
 combat.start('right');combat.update(.5,[behind,far,smoke,wall,visible],new THREE.Vector3(),new THREE.Vector3(0,0,1));expect(hits).toEqual([visible]);
});
test('загруженный Ironvex получает привязку исходных вершин и движение обеих рук',async({page})=>{
 test.setTimeout(90000);await page.route('**/harness',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('/harness');const result=await page.evaluate(async()=>{
 const {loadIronvex}=await import('/src/ironvex.js');const rig=await loadIronvex();let mesh;rig.body.traverse(o=>{if(o.isSkinnedMesh&&!mesh)mesh=o;});let badHandWeights=0;rig.body.traverse(o=>{if(!o.isSkinnedMesh)return;const p=o.geometry.attributes.position,indices=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){if(Math.abs(p.getX(i))>.75&&p.getY(i)>1.07&&p.getY(i)<1.35){for(let j=0;j<4;j++)if(indices.getComponent(i,j)>=5&&weights.getComponent(i,j)>.05)badHandWeights++;}}});const initial=rig.arms[0].shoulder.rotation.x;rig.update(0,false,{side:'left',extension:1});const left=rig.arms[0].shoulder.rotation.x,rightRest=rig.arms[1].shoulder.rotation.x;const leftWrist=rig.arms[0].forearm.localToWorld(rig.body.position.clone().set(-.07,-.43,.08));const leftAim=Math.abs(leftWrist.x)<.5&&leftWrist.z>.5;rig.update(0,false,{side:'right',extension:1});const rightWrist=rig.arms[1].forearm.localToWorld(rig.body.position.clone().set(.07,-.43,.08));return {leftAim,rightAim:Math.abs(rightWrist.x)<.5&&rightWrist.z>.5,badHandWeights,vertices:rig.vertices,skins:rig.body.children.filter(o=>o.isSkinnedMesh).length,bones:rig.skeleton.bones.length,leftMoved:Math.abs(left-initial)>.8,rightStayed:Math.abs(rightRest-initial)<.01,rightMoved:Math.abs(rig.arms[1].shoulder.rotation.x-initial)>.8,attributes:!!mesh.geometry.attributes.skinWeight&&!!mesh.geometry.attributes.skinIndex};});
 expect(result).toMatchObject({leftAim:true,rightAim:true,badHandWeights:0,vertices:344317,skins:6,bones:9,leftMoved:true,rightStayed:true,rightMoved:true,attributes:true});
});
test('Ironvex выбирается в меню, бьёт на ЛКМ/ПКМ и оставляет Кастиэля доступным',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('/?graphics=basic');await page.locator('#select-ironvex').click();await expect(page.locator('#select-ironvex')).toHaveAttribute('aria-pressed','true',{timeout:60000});await page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/}).click();await expect(page.locator('.hud-title')).toHaveText('Ironvex');
 await page.mouse.click(400,300,{button:'left'});await expect(page.locator('#punch-state')).toHaveText('Левый удар');await expect(page.locator('#punch-state')).toHaveText('Боевая стойка',{timeout:30000});
 await page.mouse.click(400,300,{button:'right'});await expect(page.locator('#punch-state')).toHaveText('Правый удар');await page.screenshot({path:'test-results/ironvex-game.png'});
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Выбор персонажа и карты'}).click();await page.locator('#select-castiel').click();await expect(page.locator('#select-castiel')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/}).click();await expect(page.locator('.hud-title')).toHaveText('Кастиэль');await expect(page.locator('#grace')).toBeVisible();expect(errors).toEqual([]);
});
