export const GRACE_RADIUS=8;
export function graceTargets(enemies,position){
 return enemies.filter(enemy=>!enemy.userData.evaporating&&enemy.position.distanceTo(position)<=GRACE_RADIUS);
}
