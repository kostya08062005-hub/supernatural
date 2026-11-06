import * as THREE from 'three';
function smokeTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,2,64,64,62);g.addColorStop(0,'rgba(0,0,0,.96)');g.addColorStop(.4,'rgba(4,3,8,.84)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const smokeMap=smokeTexture();
export class DemonBehavior {
 constructor(canMove){this.canMove=canMove;this.nextId=0;this.hosts=[];}
 register(enemy){const id=this.nextId++;enemy.userData.smokeCD=7+(id%4)*2;enemy.userData.held=0;enemy.userData.demonId=id;}
 hold(enemy){if(enemy.userData.smoke||enemy.userData.evaporating)return false;enemy.userData.held=6;this.marker(enemy);return true;}
 marker(enemy){if(enemy.userData.holdMarker)return;const m=new THREE.Mesh(new THREE.TorusGeometry(.55,.018,5,48),new THREE.MeshBasicMaterial({color:0x9cdaff,transparent:true,opacity:.8,toneMapped:false}));m.rotation.x=Math.PI/2;m.position.y=.2;enemy.add(m);enemy.userData.holdMarker=m;}
 release(enemy){enemy.userData.held=0;enemy.position.y=0;enemy.rotation.z=0;const m=enemy.userData.holdMarker;if(m){enemy.remove(m);m.geometry.dispose();m.material.dispose();enemy.userData.holdMarker=null;}}
 escape(enemy,player){const angle=(enemy.userData.demonId*2.399)+.6;let destination=null;
  for(let i=0;i<8;i++){const a=angle+i*Math.PI/4;const x=player.x+Math.sin(a)*7,z=player.z+Math.cos(a)*7;if(this.canMove(x,z,.4)){destination=new THREE.Vector3(x,0,z);break;}}
  if(!destination)return false;
  const host=enemy.clone(true);host.userData={};host.rotation.z=Math.PI/2;host.position.y=.32;host.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();o.material.transparent=true;o.material.color.multiplyScalar(.65);o.material.emissive?.set(0);}});enemy.parent?.add(host);this.hosts.push({host,time:0});
  const cloud=new THREE.Group();for(let i=0;i<15;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeMap,transparent:true,depthWrite:false,opacity:.9,fog:false}));s.scale.setScalar(.8+(i%3)*.2);cloud.add(s);}enemy.add(cloud);
  enemy.userData.smoke={time:0,from:enemy.position.clone(),to:destination,cloud};enemy.children.forEach(o=>{if(o!==cloud)o.visible=false;});return true;
 }
 restore(enemy){const s=enemy.userData.smoke;if(s){enemy.remove(s.cloud);s.cloud.children.forEach(p=>p.material.dispose());enemy.children.forEach(o=>o.visible=true);enemy.userData.smoke=null;}this.release(enemy);enemy.position.y=0;enemy.rotation.z=0;}
 updateAmbient(dt){for(const a of [...this.hosts]){a.time+=dt;if(a.time>5)a.host.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,6-a.time);});if(a.time>=6){this.disposeHost(a);this.hosts=this.hosts.filter(v=>v!==a);}}}
 disposeHost(a){a.host.parent?.remove(a.host);a.host.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 clear(){this.hosts.forEach(a=>this.disposeHost(a));this.hosts=[];}
 update(enemy,dt,player,locked=false){const u=enemy.userData;
  if(locked){if(u.held)this.release(enemy);return 'locked';}
  if(u.held>0){u.held=Math.max(0,u.held-dt);enemy.position.y=.12+Math.sin(u.held*5)*.025;enemy.rotation.z=Math.sin(u.held*9)*.025;u.holdMarker.rotation.z+=dt;if(u.held===0){this.release(enemy);enemy.rotation.z=0;}return 'held';}
  if(u.smoke){const s=u.smoke;s.time+=dt;const t=THREE.MathUtils.smoothstep(s.time,.3,2.0);enemy.position.lerpVectors(s.from,s.to,t);enemy.position.y=Math.sin(Math.min(1,s.time/2.4)*Math.PI)*2.4;
   s.cloud.children.forEach((p,i)=>{const a=s.time*4+i*.7;p.position.set(Math.sin(a)*.23,1+i*.09,Math.cos(a)*.23);p.material.opacity=.45+(i%3)*.17;});
   if(s.time>=2.4){this.restore(enemy);enemy.position.copy(s.to);u.smokeCD=12+(u.demonId%3)*2;}return 'smoke';
  }
  u.smokeCD-=dt;const distance=enemy.position.distanceTo(player);
  if(u.smokeCD<=0&&distance>4&&distance<28&&this.escape(enemy,player))return 'smoke';return 'body';
 }
}
export function holdTarget(enemies,position,forward){return enemies.filter(e=>!e.userData.smoke&&!e.userData.evaporating&&e.position.distanceTo(position)<=12).map(e=>{const v=e.position.clone().sub(position);v.y=0;return {e,dot:v.normalize().dot(forward),distance:e.position.distanceTo(position)};}).filter(v=>v.dot>.65).sort((a,b)=>b.dot-a.dot||a.distance-b.distance)[0]?.e;}
