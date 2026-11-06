import * as THREE from 'three';
const attacks={left:{duration:.62,impact:.26,windup:.10,damage:35,range:2.0,stun:.35,knockback:.25},right:{duration:.94,impact:.43,windup:.20,damage:65,range:2.2,stun:.65,knockback:.65}};
export class PunchCombat {
 constructor(onHit=()=>{},canHit=()=>true){this.onHit=onHit;this.canHit=canHit;this.reset();}
 reset(){this.attack=null;this.lastHit=false;}
 start(side){if(this.attack||!attacks[side])return false;this.attack={...attacks[side],side,time:0,landed:false};this.lastHit=false;return true;}
 get pose(){const a=this.attack;if(!a)return null;const extension=a.time<a.impact?THREE.MathUtils.smoothstep(a.time,a.windup,a.impact):1-THREE.MathUtils.smoothstep(a.time,a.impact,a.duration);return {side:a.side,extension};}
 update(dt,enemies,position,forward){const a=this.attack;if(!a)return;a.time+=dt;
  if(a.time>=a.impact&&!a.landed){a.landed=true;const target=enemies.filter(e=>!e.userData.evaporating&&!e.userData.smoke).map(e=>{const v=e.position.clone().sub(position);const distance=v.length();v.y=0;return {e,distance,dot:v.normalize().dot(forward)};}).filter(t=>t.distance<=a.range&&t.dot>.55&&this.canHit(position,t.e.position)).sort((a,b)=>a.distance-b.distance)[0];
   if(target){this.lastHit=true;this.onHit(target.e,a.damage,a.stun,a.knockback,forward,a.side);}
  }if(a.time>=a.duration)this.attack=null;
 }
}
