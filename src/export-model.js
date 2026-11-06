import * as THREE from 'three';

// Copy the visible geometry without game state or references to scene objects.
function copyVisible(source){
 if(!source.visible)return null;
 const node=source.isMesh?new THREE.Mesh(source.geometry,source.material):new THREE.Group();
 node.name=source.name;node.position.copy(source.position);node.quaternion.copy(source.quaternion);node.scale.copy(source.scale);
 for(const child of source.children){const copy=copyVisible(child);if(copy)node.add(copy);}return node;
}
export async function exportCastiel(player){
 const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
 const model=copyVisible(player);model.position.set(0,0,0);model.quaternion.identity();
 const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});
 const url=URL.createObjectURL(new Blob([data],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='castiel-reference.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
