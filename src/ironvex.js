import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The supplied model is a static armour model. This small runtime rig binds its
// existing vertices and textures; no replacement geometry is used for the hero.
let cached;
export function loadIronvex(onProgress=()=>{}) {
 if(!cached)cached=Promise.all([new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'public/models/ironvex.glb',onProgress),fetch(import.meta.env.BASE_URL+'public/models/ironvex-skin.bin').then(r=>{if(!r.ok)throw new Error('Не загружена привязка модели');return r.arrayBuffer();})]).then(([gltf,weights])=>rigIronvex(gltf.scene,weights)).catch(error=>{cached=null;throw error;});
 return cached;
}
const smooth=THREE.MathUtils.smoothstep;
export function rigIronvex(source,weightData) {
 const header=new DataView(weightData);if(header.getUint32(0,true)!==0x47495249)throw new Error('Неверный формат привязки');const total=header.getUint32(4,true);if(weightData.byteLength!==8+total*8)throw new Error('Неполная привязка');const skinIndices=new Uint8Array(weightData,8,total*4),skinWeights=new Uint8Array(weightData,8+total*4,total*4);
 source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const scale=2.7/size.y;const fit=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const node=new THREE.Group();node.name='Ironvex';const body=new THREE.Group();node.add(body);
 const root=new THREE.Bone();root.name='Root';body.add(root);const bones=[root],arms=[],legs=[];
 for(const side of [-1,1]) {
  const shoulder=new THREE.Bone();shoulder.name=side<0?'LeftUpperArm':'RightUpperArm';shoulder.position.set(side*.57,2.15,0);root.add(shoulder);
  const forearm=new THREE.Bone();forearm.name=side<0?'LeftForearm':'RightForearm';forearm.position.set(side*.16,-.36,.02);shoulder.add(forearm);bones.push(shoulder,forearm);arms.push({shoulder,forearm});
 }
 for(const side of [-1,1]) {
  const hip=new THREE.Bone();hip.name=side<0?'LeftThigh':'RightThigh';hip.position.set(side*.29,1.36,0);root.add(hip);
  const knee=new THREE.Bone();knee.name=side<0?'LeftShin':'RightShin';knee.position.set(side*.10,-.52,.09);hip.add(knee);bones.push(hip,knee);legs.push({hip,knee});
 }
 body.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);let vertices=0;
 source.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit,mesh.matrixWorld));const pos=geometry.attributes.position;
  geometry.setAttribute('skinIndex',new THREE.Uint8BufferAttribute(skinIndices.slice(vertices*4,(vertices+pos.count)*4),4));geometry.setAttribute('skinWeight',new THREE.Uint8BufferAttribute(skinWeights.slice(vertices*4,(vertices+pos.count)*4),4,true));
  const skinned=new THREE.SkinnedMesh(geometry,mesh.material);skinned.name=mesh.name;skinned.castShadow=skinned.receiveShadow=true;skinned.frustumCulled=false;body.add(skinned);skinned.bind(skeleton);vertices+=pos.count;
 });
 function update(time,moving,pose=null){
  const extension=pose?.extension||0,active=pose?.side==='left'?0:1;
  arms.forEach(({shoulder,forearm},i)=>{const e=pose&&i===active?extension:0;shoulder.rotation.set(-e*1.25, (i?-1:1)*e*.6,(i?1:-1)*e*.04,'YXZ');forearm.rotation.set(-Math.sin(e*Math.PI)*.25,0,0);});
  legs.forEach(({hip,knee},i)=>{const step=moving?Math.sin(time*7+i*Math.PI):0;hip.rotation.x=step*.19;knee.rotation.x=Math.max(0,-step)*.15;});
  body.rotation.y=(pose?.side==='left'?1:-1)*extension*.10;body.position.set(0,moving?Math.abs(Math.sin(time*7))*.018:0,extension*.10);body.updateMatrixWorld(true);
 }
 if(vertices!==total)throw new Error('Привязка не соответствует модели');
 update(0,false);return {node,body,skeleton,arms,legs,vertices,update};
}
