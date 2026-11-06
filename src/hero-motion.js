import * as THREE from 'three';

export class HeroMotion {
 constructor(player,keys,canMove,effect=()=>{},notify=()=>{}) {
  this.player=player;this.keys=keys;this.canMove=canMove;this.effect=effect;this.notify=notify;
  this.visual=new THREE.Group();this.visual.position.y=1.1;
  for(const child of [...player.children]){player.remove(child);child.position.y-=1.1;this.visual.add(child);}player.add(this.visual);
  this.reset();
 }
 reset(){this.speedMultiplier=1;this.cameraDistance=5.8;this.yaw=Math.PI;this.pitch=.26;this.velocityY=0;this.teleportCD=0;this.rollCD=0;this.roll=null;this.invulnerable=0;this.player.position.y=0;this.visual.quaternion.identity();}
 look(dx,dy){this.yaw-=Math.max(-120,Math.min(120,dx))*.004;this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.003,-.1,.9);}
 forward(){return new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));}
 direction(){const k=this.keys;return new THREE.Vector3((k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0),0,(k.has('KeyS')||k.has('ArrowDown')?1:0)-(k.has('KeyW')||k.has('ArrowUp')?1:0)).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);}
 move(dx,dz){const p=this.player.position;if(this.canMove(p.x+dx,p.z))p.x+=dx;if(this.canMove(p.x,p.z+dz))p.z+=dz;}
 get grounded(){return this.player.position.y<.001&&this.velocityY<=0;}
 jump(blocked=false){if(blocked||!this.grounded||this.roll)return false;this.velocityY=6.2;this.notify('Прыжок');return true;}
 dodge(blocked=false){if(blocked||!this.grounded||this.roll||this.rollCD>0)return false;const dir=this.direction();if(dir.lengthSq()===0)dir.copy(this.forward());this.roll={time:0,dir};this.rollCD=1.4;this.invulnerable=.6;this.notify('Перекат');return true;}
 teleport(blocked=false){if(blocked||this.roll||this.teleportCD>0)return false;const dir=this.forward(),p=this.player.position;let destination=null;
  for(let distance=10;distance>=2;distance-=.4){const x=p.x+dir.x*distance,z=p.z+dir.z*distance;if(this.canMove(x,z)){destination=new THREE.Vector3(x,0,z);break;}}
  if(!destination){this.notify('Нет места для телепортации');return false;}
  this.effect(p.clone());p.copy(destination);this.velocityY=0;this.effect(p.clone());this.teleportCD=6;this.invulnerable=.5;this.notify('Телепортация');return true;
 }
 update(dt,blocked=false){this.teleportCD=Math.max(0,this.teleportCD-dt);this.rollCD=Math.max(0,this.rollCD-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
  if(!blocked)this.player.rotation.y=this.yaw+Math.PI;
  if(this.roll){const r=this.roll;r.time+=dt;const fraction=Math.min(1,r.time/.62);this.move(r.dir.x*dt*5.3,r.dir.z*dt*5.3);const axis=new THREE.Vector3(r.dir.z,0,-r.dir.x).applyAxisAngle(new THREE.Vector3(0,1,0),-this.player.rotation.y);this.visual.quaternion.setFromAxisAngle(axis,-Math.PI*2*fraction);if(fraction>=1){this.roll=null;this.visual.quaternion.identity();}}
  else if(!blocked){const dir=this.direction();const speed=(this.keys.has('ShiftLeft')?7:4.5)*this.speedMultiplier;this.move(dir.x*dt*speed,dir.z*dt*speed);}
  if(this.player.position.y>0||this.velocityY>0){this.velocityY-=16*dt;this.player.position.y=Math.max(0,this.player.position.y+this.velocityY*dt);if(this.player.position.y===0)this.velocityY=0;}
 }
 get state(){return this.roll?'Перекат':this.grounded?'На земле':'Прыжок';}
 cameraPosition(){return this.player.position.clone().add(new THREE.Vector3(Math.sin(this.yaw)*this.cameraDistance,1.7+Math.sin(this.pitch)*this.cameraDistance,Math.cos(this.yaw)*this.cameraDistance));}
}
