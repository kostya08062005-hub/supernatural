import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function postprocessing(renderer,scene,camera){
 const basic = new URLSearchParams(location.search).get('graphics') === 'basic';
 if (basic || !renderer.extensions.has('EXT_color_buffer_float')) {
  return {render:()=>renderer.render(scene,camera),setSize:()=>{},basic:true};
 }
 const composer=new EffectComposer(renderer);
 composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.85,.65,1.15);
 composer.addPass(bloom);composer.addPass(new OutputPass());
 return composer;
}
export function surface(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 let seed=942;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 x.fillStyle=kind==='earth'?'#414534':kind==='stone'?'#73746c':'#514737';x.fillRect(0,0,256,256);
 for(let i=0;i<6500;i++){const v=Math.floor(random()*65);x.fillStyle=`rgba(${v+40},${v+42},${v+30},.28)`;const a=random()*256,b=random()*256;x.fillRect(a,b,kind==='wood'?1:random()*6+1,kind==='wood'?random()*35:random()*3+1);}
 if(kind==='stone'){x.strokeStyle='#343b36';x.lineWidth=2;for(let j=0;j<8;j++){x.beginPath();x.moveTo(0,j*32);x.lineTo(256,j*32);x.stroke();for(let i=0;i<4;i++){const a=i*64+(j%2)*32;x.beginPath();x.moveTo(a,j*32);x.lineTo(a,j*32+32);x.stroke();}}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='earth'?32:2,kind==='earth'?32:2);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.13,'rgba(225,245,255,.95)');g.addColorStop(.35,'rgba(130,198,255,.38)');g.addColorStop(1,'rgba(30,90,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glow=glowTexture();
export function radiance(color=0xcceeff,scale=1){const group=new THREE.Group();
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.scale.setScalar(scale*1.7);group.add(sprite);
 const core=new THREE.Mesh(new THREE.SphereGeometry(.075,12,10),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(7),toneMapped:false}));group.add(core);
 const light=new THREE.PointLight(color,0,10);group.add(light);group.userData={sprite,light};return group;
}
export function shadowWings(){
 const root=new THREE.Group();root.position.set(0,1.65,-.4);
 const c=document.createElement('canvas');c.width=256;c.height=384;const x=c.getContext('2d');x.filter='blur(5px)';x.fillStyle='rgba(0,0,0,.94)';x.beginPath();x.moveTo(10,300);x.bezierCurveTo(40,236,55,158,117,78);x.bezierCurveTo(147,40,191,23,215,12);x.bezierCurveTo(229,84,245,150,221,231);x.lineTo(203,301);x.lineTo(199,267);x.lineTo(179,319);x.lineTo(176,282);x.lineTo(155,331);x.lineTo(153,297);x.bezierCurveTo(112,274,65,280,10,300);x.fill();
 const texture=new THREE.CanvasTexture(c);
 const material=new THREE.MeshBasicMaterial({map:texture,color:0x000000,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false,fog:false,toneMapped:false,alphaTest:.008});
 for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.PlaneGeometry(2.65,3.5),material);wing.position.set(side*1.38,.65,-.08);if(side<0)wing.scale.x=-1;wing.userData.side=side;root.add(wing);}
 root.userData.material=material;return root;
}
export function makeArm(coat,skin){const arm=new THREE.Group();
 const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.087,.326,8,18),coat);
 const fore=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.35,8,18),coat);
 for(const sleeve of [upper,fore]){const v=sleeve.geometry.attributes.position;for(let i=0;i<v.count;i++){const y=v.getY(i),a=Math.atan2(v.getZ(i),v.getX(i)),fold=Math.sin(y*68+a*3)*.0025*Math.exp(-Math.pow((y+.14)/.09,2));v.setX(i,v.getX(i)+Math.cos(a)*fold);v.setZ(i,v.getZ(i)+Math.sin(a)*fold);}sleeve.geometry.computeVertexNormals();}
 const elbow=new THREE.Mesh(new THREE.SphereGeometry(.076,14,10),coat);
 const hand=new THREE.Group();const palm=new THREE.Mesh(new THREE.SphereGeometry(1,18,14),skin);palm.scale.set(.039,.054,.021);hand.add(palm);
 const nailMat=new THREE.MeshStandardMaterial({color:0xcba996,roughness:.52});
 for(let i=0;i<4;i++){const x=(i-1.5)*.021,length=[.078,.095,.089,.068][i];
  for(let j=0;j<3;j++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.009-j*.0008,length/3-.014,4,8),skin);finger.position.set(x,-.045-(j+.5)*length/3,.004+j*.003);finger.rotation.x=-j*.12;hand.add(finger);}
  const nail=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),nailMat);nail.scale.set(.006,.012,.0015);nail.position.set(x,-.043-length,.015);hand.add(nail);
 }
 for(let j=0;j<2;j++){const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.018,4,8),skin);thumb.position.set(-.045-j*.014,-.012-j*.027,0);thumb.rotation.z=-.55;hand.add(thumb);}
 const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.079,.076,.045,18),coat);cuff.position.y=-.21;fore.add(cuff);
 const buttons=new THREE.MeshStandardMaterial({color:0x382e25,roughness:.6});
 for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),buttons);b.scale.z=.4;b.position.set(.056,-.14+i*.04,.069);fore.add(b);}
 arm.add(upper,fore,hand,elbow);arm.traverse(o=>{o.castShadow=true;o.receiveShadow=true;});arm.userData={upper,fore,hand,elbow};poseArm(arm,new THREE.Vector3(0,-.92,.03));return arm;
}
export function poseArm(arm,end){const {upper,fore,hand,elbow}=arm.userData;
 const reach=end.clone();if(reach.length()>.95)reach.setLength(.95);
 const mid=reach.clone().multiplyScalar(.5);const bend=Math.sqrt(Math.max(0,.48**2-reach.lengthSq()/4));mid.z+=reach.y<-.6?bend*.35:-bend;
 const segment=(o,a,b)=>{o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());o.scale.y=a.distanceTo(b)/.5;};
 if(elbow)elbow.position.copy(mid);segment(upper,new THREE.Vector3(),mid);segment(fore,mid,reach);hand.position.copy(reach);hand.rotation.x=reach.y>0?-Math.PI/2:0;
}

export function dressWorld(world){
 const random=(i)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
 const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.09,.45,3),new THREE.MeshStandardMaterial({color:0x536047,roughness:1}),1600);
 const dummy=new THREE.Object3D();
 for(let i=0;i<1600;i++){let x=(random(i*3)-.5)*88,z=(random(i*3+1)-.5)*84;if(Math.abs(x)<3||Math.abs(z+7)<2.6)x+=x<0?-4:4;dummy.position.set(x,.12,z);dummy.rotation.set(0,random(i*3+2)*Math.PI,random(i+90)*.3);dummy.scale.setScalar(.5+random(i+17));dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
 grass.receiveShadow=true;world.add(grass);
 const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x555d56,roughness:.95}),100);
 for(let i=0;i<100;i++){const x=(random(i+800)-.5)*85,z=(random(i+900)-.5)*85;dummy.position.set(Math.abs(x)<4?x+6:x,0,z);dummy.rotation.set(random(i)*2,random(i+10)*3,random(i+20));dummy.scale.set(.2+random(i+30)*.6,.15+random(i+40)*.3,.3+random(i+50)*.4);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.castShadow=true;stones.receiveShadow=true;world.add(stones);
 const vertices=[];for(let i=0;i<150;i++)vertices.push((random(i+1000)-.5)*75,.5+random(i+1200)*5,(random(i+1500)-.5)*75);
 const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)),new THREE.PointsMaterial({color:0xa7b3af,size:.025,transparent:true,opacity:.4,depthWrite:false}));world.add(dust);
}
