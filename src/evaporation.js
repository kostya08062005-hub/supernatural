import * as THREE from 'three';

const duration=1.65;
function ashMap(){const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const g=x.createRadialGradient(16,16,1,16,16,15);g.addColorStop(0,'#ffffff');g.addColorStop(.4,'#ffffff');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);}
const sprite=ashMap();
const noise=`
 varying vec3 vAshWorld;
 uniform float uAshProgress;
 uniform float uAshBase;
 float ashHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
 float ashNoise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(ashHash(i),ashHash(i+vec3(1,0,0)),f.x),mix(ashHash(i+vec3(0,1,0)),ashHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ashHash(i+vec3(0,0,1)),ashHash(i+vec3(1,0,1)),f.x),mix(ashHash(i+vec3(0,1,1)),ashHash(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
`;
export class EvaporationSystem {
 constructor(parent){this.parent=parent;this.items=[];}
 get count(){return this.items.length;}
 start(enemy){
  if(enemy.userData.evaporating)return;enemy.userData.evaporating=true;
  const progress={value:0},base={value:enemy.position.y},cache=new Map();
  enemy.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;const original=o.material;
   if(!cache.has(original)){const material=original.clone();material.onBeforeCompile=shader=>{
    shader.uniforms.uAshProgress=progress;shader.uniforms.uAshBase=base;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAshWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvAshWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+noise).replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      float ashField=(vAshWorld.y-uAshBase)/2.3+(ashNoise(vAshWorld*18.0)-0.5)*0.24;
      float ashFront=1.05-uAshProgress*1.5;
      if(ashField>ashFront) discard;
      float ashEdge=smoothstep(ashFront-0.1,ashFront,ashField);
    `).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.025,0.02,0.018),ashEdge);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(10.0,8.0,5.0)*ashEdge;');
   };material.customProgramCacheKey=()=> 'angel-ash-v1';cache.set(original,material);}o.material=cache.get(original);
  });
  const count=200,positions=new Float32Array(count*3),colors=new Float32Array(count*3),seeds=[];
  for(let i=0;i<count;i++){const y=(i+.5)/count*2.17;const angle=i*2.39996;seeds.push({x:Math.cos(angle)*(.12+(i%7)*.037),y,z:Math.sin(angle)*.18,delay:(1.05-y/2.3)/1.5*duration,vx:Math.sin(i*12.7)*.55,vz:Math.cos(i*6.9)*.55});positions[i*3+1]=-1000;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const particles=new THREE.Points(geometry,new THREE.PointsMaterial({map:sprite,vertexColors:true,size:.065,transparent:true,depthWrite:false,opacity:.9,toneMapped:false}));particles.name='Grace ashes';particles.frustumCulled=false;particles.position.copy(enemy.position);this.parent.add(particles);
  this.items.push({enemy,progress,cache,particles,seeds,time:0});
 }
 update(dt){
  for(const a of [...this.items]){a.time+=dt;a.progress.value=Math.min(1,a.time/duration);const p=a.particles.geometry.attributes.position,c=a.particles.geometry.attributes.color;
   a.seeds.forEach((s,i)=>{const t=a.time-s.delay;if(t<0||t>1.3){p.setXYZ(i,0,-1000,0);return;}
    p.setXYZ(i,s.x+s.vx*t+Math.sin(t*4+i)*t*.12,s.y+t*(1.2+(i%4)*.2),s.z+s.vz*t);
    const hot=Math.max(0,1-t*3);const ash=Math.max(.025,.2*(1-t/1.3));c.setXYZ(i,ash+hot*3,ash+hot*2.1,ash+hot*.8);
   });p.needsUpdate=c.needsUpdate=true;
   if(a.time>=duration+1){this.dispose(a);this.items=this.items.filter(v=>v!==a);}
  }
 }
 dispose(a){this.parent.remove(a.enemy,a.particles);a.enemy.traverse(o=>{if(o.geometry)o.geometry.dispose();});for(const [original,material] of a.cache){original.dispose();material.dispose();}a.particles.geometry.dispose();a.particles.material.dispose();}
 clear(){this.items.forEach(a=>this.dispose(a));this.items=[];}
}
