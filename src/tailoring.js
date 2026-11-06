import * as THREE from 'three';

export function profile(points,t){
 let i=1;while(i<points.length-1&&t>points[i][0])i++;
 const a=points[i-1],b=points[i],before=points[Math.max(0,i-2)],after=points[Math.min(points.length-1,i+1)],u=THREE.MathUtils.clamp((t-a[0])/(b[0]-a[0]),0,1),d=b[0]-a[0];
 const m0=(b[1]-before[1])/(b[0]-before[0]),m1=(after[1]-a[1])/(after[0]-a[0]);
 return (2*u**3-3*u**2+1)*a[1]+(u**3-2*u**2+u)*m0*d+(-2*u**3+3*u**2)*b[1]+(u**3-u**2)*m1*d;
}
export function ringSurface(rows,columns,point){
 const p=[],uv=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){p.push(...point(j/rows,i/columns));uv.push(i/columns,j/rows);if(j<rows&&i<columns){const k=j*(columns+1)+i;idx.push(k,k+1,k+columns+1,k+1,k+columns+2,k+columns+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function clothLeg(){return ringSurface(50,32,(t,u)=>{const y=-.91+t*.94,a=u*Math.PI*2,rx=profile([[0,.061],[.1,.064],[.28,.077],[.49,.087],[.69,.10],[1,.105]],t),rz=rx*.9;const fold=.0025*Math.sin(t*92+a*3)*Math.exp(-Math.pow((t-.15)/.12,2))+.002*Math.sin(t*60-a*2)*Math.exp(-Math.pow((t-.52)/.13,2));return [(rx+fold)*Math.sin(a),y,(rz+fold)*Math.cos(a)];});}
export function shoeUpper(){
 const g=new THREE.SphereGeometry(1,40,24),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const z=p.getZ(i)*.15+.045,y=p.getY(i);const width=z>.11?.9:1;const h=.055+.04*Math.exp(-Math.pow((z+.025)/.065,2));p.setXYZ(i,p.getX(i)*.082*width,Math.max(-.038,y*h),z);}g.computeVertexNormals();return g;
}
export function sole(){const s=new THREE.Shape();s.moveTo(-.059,-.103);s.quadraticCurveTo(-.086,-.02,-.081,.12);s.quadraticCurveTo(-.077,.21,0,.215);s.quadraticCurveTo(.077,.21,.081,.12);s.quadraticCurveTo(.086,-.02,.059,-.103);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1});g.rotateX(Math.PI/2);return g;}

// One continuous cloth sleeve replaces the three separate capsule-shaped parts.
export function sleeveGeometry(){const rows=32,cols=24,g=ringSurface(rows,cols,()=>[0,0,0]);const index=g.index;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+1));index.setX(i+1,a);}g.userData={rows,cols};return g;}
export function fitSleeve(geometry,mid,end){
 const {rows,cols}=geometry.userData,p=geometry.attributes.position,n=geometry.attributes.normal;
 const wrist=end.clone().multiplyScalar(.94);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.035,0),mid,wrist]);
 const tangent=new THREE.Vector3(),right=new THREE.Vector3(),front=new THREE.Vector3(),up=new THREE.Vector3(0,0,1);
 for(let j=0;j<=rows;j++){const t=j/rows,center=curve.getPoint(t);tangent.copy(curve.getTangent(t));right.crossVectors(tangent,up).normalize();if(right.lengthSq()<.01)right.set(1,0,0);front.crossVectors(right,tangent).normalize();const radius=profile([[0,.09],[.15,.095],[.38,.087],[.57,.075],[.8,.073],[1,.068]],t);
  for(let i=0;i<=cols;i++){const a=i/cols*Math.PI*2,fold=.0035*Math.sin(t*74+a*3)*Math.exp(-Math.pow((t-.52)/.16,2))+.0015*Math.sin(t*47-a*2);const normal=right.clone().multiplyScalar(Math.cos(a)).addScaledVector(front,Math.sin(a));const v=center.clone().addScaledVector(normal,radius+fold);const index=j*(cols+1)+i;p.setXYZ(index,v.x,v.y,v.z);n.setXYZ(index,normal.x,normal.y,normal.z);}
 }p.needsUpdate=n.needsUpdate=true;geometry.computeBoundingSphere();
}
