import * as THREE from 'three';
// Landmarks occupy side areas, leaving the main combat routes open.
export function enrichLocation(world,id,collide){
 const stone=new THREE.MeshStandardMaterial({color:0x606860,roughness:.96}),wood=new THREE.MeshStandardMaterial({color:0x655641,roughness:1}),iron=new THREE.MeshStandardMaterial({color:0x4c514e,roughness:.65,metalness:.45});
 function block(x,y,z,w,h,d,material=stone,solid=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;world.add(m);if(solid)collide(x,z,w,d);return m;}
 function cylinder(x,y,z,r,h,material=stone){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;world.add(m);return m;}
 function bench(x,z){block(x,.55,z,2,.16,.65,wood);for(const s of [-1,1])block(x+s*.75,.25,z,.12,.5,.55,iron);block(x,.95,z-.3,2,.5,.1,wood);collide(x,z,2,.7);}
 function arch(x,z){for(const s of [-1,1])block(x+s*2,1.8,z,.65,3.6,.8,stone,true);const a=new THREE.Mesh(new THREE.TorusGeometry(2,.32,8,32,Math.PI),stone);a.position.set(x,3.5,z);world.add(a);}
 if(id==='cemetery'){
  arch(-27,-8);for(let i=0;i<4;i++){block(-33+i*4,1,-15,3.5,2,.6,stone,true);block(-33+i*4,1,4,3.5,2,.6,stone,true);}
  for(const s of [-1,1])bench(s*8,-9);
  cylinder(28,.6,5,1.2,1.2);cylinder(28,1.2,5,1.35,.18);collide(28,5,2.6,2.6);
  for(let i=0;i<5;i++){const x=24+i*3;block(x,.4,-20,1.2,.8,1.1);block(x,1.2,-20,.2,1.2,.2);block(x,1.45,-20,.9,.18,.18);collide(x,-20,1.2,1.2);}
  block(-28,.3,14,8,.6,6,stone,true);for(const s of [-1,1])block(-28+s*3,2,14,.7,3.4,5,stone,true);block(-28,3.6,12,6,.5,.8);
 }else if(id==='forest'){
  const water=new THREE.MeshPhysicalMaterial({color:0x1b414b,roughness:.22,metalness:.3,transparent:true,opacity:.9});block(29,-.015,0,6,.04,82,water);
  // Two crossings connect both banks; water strips block walking between them.
  for(const [z,d]of [[-24.75,32.5],[5.5,22],[30.25,21.5]])collide(29,z,6,d);
  for(const z of [-7,18]){block(29,.13,z,8,.25,3,wood);for(let i=0;i<10;i++)block(25.4+i*.8,.27,z,.08,.03,3,iron);for(const s of [-1,1])block(29,.8,z+s*1.5,8,.12,.12,wood);}
  arch(-29,-5);bench(20,15);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;const x=-28+Math.sin(angle)*4,z=20+Math.cos(angle)*4;block(x,.8,z,.6,1.6,.6,stone,true);}
  const rune=new THREE.Mesh(new THREE.RingGeometry(2.7,2.8,64),new THREE.MeshBasicMaterial({color:0x94adbf,transparent:true,opacity:.5}));rune.rotation.x=-Math.PI/2;rune.position.set(-28,.015,20);world.add(rune);
 }else{
  for(const s of [-1,1]){block(s*21,3,-20,12,6,.8,stone,true);block(s*27,3,-12,.8,6,16,stone,true);for(let i=0;i<4;i++)block(s*21,3,-20+4*i,10,.15,.15,iron);}
  arch(0,-26);for(let i=0;i<12;i++){const x=15+(i%4)*2,z=10+Math.floor(i/4)*3;cylinder(x,.65,z,.55,1.3,iron);collide(x,z,1.1,1.1);}
  for(const s of [-1,1]){block(s*8,1.3,6,3.5,2.6,3,wood,true);block(s*8,1.3,18,3.5,2.6,3,wood,true);}
  for(const x of [-34,-29]){cylinder(x,5,-25,1.1,10,iron);for(let i=0;i<4;i++)cylinder(x,1+i*2,-25,1.3,.18,iron);collide(x,-25,2.6,2.6);}
  for(const x of [-1,1])block(x,.025,0,.1,.04,70,iron);
 }
}
