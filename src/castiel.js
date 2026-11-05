import * as THREE from 'three';
import headData from './assets/castiel-head.json';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeArm, shadowWings } from './visuals.js';

// Custom costume and fitting; anatomical CC0 head attribution in THIRD_PARTY.md.
const skin = new THREE.MeshPhysicalMaterial({color:0xd3ac95,roughness:.62,sheen:.15,sheenColor:0xc3927e});
const lip = new THREE.MeshStandardMaterial({color:0x9c6d60,roughness:.7});
const darkSkin = new THREE.MeshStandardMaterial({color:0x775344,roughness:.85});
const hair = new THREE.MeshStandardMaterial({color:0x231e19,roughness:.97});
const hairLight = new THREE.MeshStandardMaterial({color:0x3b3027,roughness:.9});
const hairCanvas=document.createElement('canvas');hairCanvas.width=hairCanvas.height=256;const hairContext=hairCanvas.getContext('2d');hairContext.fillStyle='#30271f';hairContext.fillRect(0,0,256,256);for(let i=0;i<4000;i++){const x=(i*71.37)%256,y=(i*29.63)%256;hairContext.strokeStyle=i%3?'#59433466':'#17130f88';hairContext.lineWidth=.5;hairContext.beginPath();hairContext.moveTo(x,y);hairContext.quadraticCurveTo(x+2,y+5,x+4,y+12);hairContext.stroke();}const hairMap=new THREE.CanvasTexture(hairCanvas);hairMap.colorSpace=THREE.SRGBColorSpace;hairMap.wrapS=hairMap.wrapT=THREE.RepeatWrapping;hairMap.repeat.set(3,3);hair.map=hairMap;hair.bumpMap=hairMap;hair.bumpScale=.0005;hair.color.set(0xffffff);hair.side=THREE.DoubleSide;
const stitch = new THREE.MeshStandardMaterial({color:0x8e8068,roughness:1});
const button = new THREE.MeshStandardMaterial({color:0x302923,roughness:.55});

function weave(color) {
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle=color;x.fillRect(0,0,256,256);
 for(let i=0;i<256;i++) {x.fillStyle=i%2?'#ffffff0c':'#00000010';x.fillRect(i,0,1,256);x.fillRect(0,i,256,1);}
 const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,8);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map,roughness:.91,bumpMap:map,bumpScale:.0007,side:THREE.DoubleSide});
}
const coat=weave('#b0a087'),suit=weave('#272f39'),shirt=weave('#dad7cc'),tieMat=weave('#253e61');
const leather=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.42});
function add(parent,geometry,material,position=[0,0,0],scale=[1,1,1]) {const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function oval(parent,material,position,scale){return add(parent,new THREE.SphereGeometry(1,24,18),material,position,scale);}
function seam(parent,coords,radius,material=stitch){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coords.map(v=>new THREE.Vector3(...v))),Math.max(8,coords.length*5),radius,5,false),material);}
function panel(parent,coords,material){const geometry=new THREE.BufferGeometry();const vertices=[];for(let i=1;i<coords.length-1;i++)vertices.push(...coords[0],...coords[i],...coords[i+1]);geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i]*3,vertices[i+1]*3]:[]),2));geometry.computeVertexNormals();return add(parent,geometry,material);}
function batch(group) {
 // Preserve articulated limbs; combine static costume and facial parts by material.
 const bins=new Map();group.updateMatrixWorld(true);
 for(const o of [...group.children]) {if(!o.isMesh||o.name==='anatomical-head')continue;const g=o.geometry.clone().applyMatrix4(o.matrix);if(g.index) {const flat=g.toNonIndexed();g.dispose();bins.set(o.material,[...(bins.get(o.material)||[]),flat]);} else bins.set(o.material,[...(bins.get(o.material)||[]),g]);group.remove(o);o.geometry.dispose();}
 for(const [material,geometries] of bins){for(const g of geometries){for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));}
 const geometry=mergeGeometries(geometries);add(group,geometry,material);geometries.forEach(g=>g.dispose());}
}
function interpolate(points,t){for(let i=1;i<points.length;i++){if(t<=points[i][0]){const a=points[i-1],b=points[i],before=points[Math.max(0,i-2)],after=points[Math.min(points.length-1,i+1)];const range=b[0]-a[0],u=(t-a[0])/range;const m0=(b[1]-before[1])/(b[0]-before[0]),m1=(after[1]-a[1])/(after[0]-a[0]);return Math.max(.001,(2*u**3-3*u**2+1)*a[1]+(u**3-2*u**2+u)*m0*range+(-2*u**3+3*u**2)*b[1]+(u**3-u**2)*m1*range);}}return points.at(-1)[1];}
function smoothSeam(g,rows,cols){const normal=g.attributes.normal;for(let j=0;j<=rows;j++){const a=j*(cols+1),b=a+cols;const n=new THREE.Vector3().fromBufferAttribute(normal,a).add(new THREE.Vector3().fromBufferAttribute(normal,b)).normalize();normal.setXYZ(a,n.x,n.y,n.z);normal.setXYZ(b,n.x,n.y,n.z);}}
function skinDetail(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');let seed=1847;const data=x.createImageData(256,256);for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=105+seed%45;data.data.set([v,v,v,255],i);}x.putImageData(data,0,0);const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,5);return map;}
const headSkin=skin.clone();headSkin.vertexColors=true;headSkin.bumpMap=skinDetail();headSkin.bumpScale=.00013;
function sculptHead(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(headData.position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(headData.uv,2));g.setIndex(headData.index);g.computeVertexNormals();const colors=[];for(let i=0;i<headData.position.length;i+=3){const x=headData.position[i],y=headData.position[i+1],z=headData.position[i+2];const front=THREE.MathUtils.smoothstep(z,.06,.11);const lips=Math.exp(-Math.pow(x/.037,4)-Math.pow((y+.061)/.010,4))*front;const beard=Math.exp(-Math.pow((y+.105)/.034,2))*front*.065;const cheek=Math.exp(-Math.pow((Math.abs(x)-.072)/.03,2)-Math.pow((y+.012)/.027,2))*front;colors.push(1-beard-lips*.12,1-beard-lips*.25-cheek*.04,1-beard-lips*.23-cheek*.035);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
function irisTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#263e4b';x.fillRect(0,0,128,128);for(let i=0;i<180;i++){const a=i*Math.PI*2/180;x.strokeStyle=i%3?'#718f9b':'#405f6d';x.lineWidth=1;x.beginPath();x.moveTo(64+Math.cos(a)*15,64+Math.sin(a)*15);x.lineTo(64+Math.cos(a)*57,64+Math.sin(a)*57);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function face(parent){
 const skinMesh=add(parent,sculptHead(),headSkin);skinMesh.name='anatomical-head';
 const eyes=[];const white=new THREE.MeshPhysicalMaterial({color:0xdedbd2,roughness:.28,clearcoat:.6});
 const irisMat=new THREE.MeshPhysicalMaterial({map:irisTexture(),roughness:.25,clearcoat:.9,side:THREE.DoubleSide});
 for(const s of [-1,1]){const x=s*.0445,y=.041;
 oval(parent,white,[x,y,.088],[.023,.022,.022]);
 const iris=add(parent,new THREE.CircleGeometry(.0092,40),irisMat,[x,y+.001,.1105]);eyes.push(iris);
 add(parent,new THREE.CircleGeometry(.0031,24),new THREE.MeshBasicMaterial({color:0x06090c}),[x,y,.111]);
 oval(parent,new THREE.MeshBasicMaterial({color:0xffffff}),[x-.002,y+.003,.112],[.0015,.0015,.0005]);
 seam(parent,[[x-s*.025,.061,.116],[x,.066,.122],[x+s*.025,.061,.107]],.0015,hair);
 for(let k=0;k<35;k++){const f=k/34-.5;const xx=x+f*.048,yy=.064+Math.cos(f*2.8)*.002;seam(parent,[[xx,yy,.119-Math.abs(f)*.018],[xx+s*.001,yy+.003,.119-Math.abs(f)*.018]],.00045,hair);}
 }
 // Short, irregular hair with a side part; all locks are merged into two draw calls.
 const scalp=new THREE.BufferGeometry(),p=[],uv=[],idx=[];const n=80,m=40;
 const hairCandidates=[];for(let i=0;i<headData.position.length;i+=3)if(headData.position[i+1]>-.04)hairCandidates.push(headData.position[i],headData.position[i+1],headData.position[i+2]);
 function hairPoint(a,b){const y=.045+Math.cos(b)*.18;let best=null,bestScore=Infinity;const desiredAngle=a>Math.PI?a-Math.PI*2:a;
 for(let i=0;i<hairCandidates.length;i+=3){const x=hairCandidates[i],yy=hairCandidates[i+1],z=hairCandidates[i+2];let angle=Math.atan2(x,z+.005),diff=Math.abs(angle-desiredAngle);diff=Math.min(diff,Math.PI*2-diff);const score=(yy-y)**2+diff**2*.004;if(score<bestScore){bestScore=score;best=[x,yy,z];}}
 return [best[0]*1.035,best[1]+.006,best[2]*1.035];}
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,edge=1.65-.50*Math.cos(a);const b=.025+j/m*edge;p.push(...hairPoint(a,b));uv.push(i/n,j/m);if(i<n&&j<m){const v=j*(n+1)+i;idx.push(v,v+n+1,v+1,v+1,v+n+1,v+n+2);}}
 scalp.setAttribute('position',new THREE.Float32BufferAttribute(p,3));scalp.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));scalp.setIndex(idx);scalp.computeVertexNormals();smoothSeam(scalp,m,n);add(parent,scalp,hair);
 for(let i=0;i<380;i++){const a=i*2.39996,b=.1+((i*37)%100)/100*(1.65-.50*Math.cos(a));const [x,y,z]=hairPoint(a,b);const path=[[x,y+.001,z],[x+.005,y+.005,z-.002],[x+.012,y+.007,z-.007],[x+.018,y+.004,z-.012]];seam(parent,path,.0011+(i%3)*.0003,i%5?hair:hairLight);}
 batch(parent);return eyes;
}
function trench(parent){
 const p=[],uv=[],idx=[],rows=42,cols=80;
 for(let j=0;j<=rows;j++){const t=j/rows,y=.48+t*1.26;const rx=interpolate([[0,.405],[.35,.32],[.6,.275],[.83,.34],[1,.35]],t),rz=interpolate([[0,.205],[.5,.174],[1,.188]],t);const opening=.34+(1-t)*.18;
 for(let i=0;i<=cols;i++){const a=opening+i/cols*(Math.PI*2-2*opening);const fold=(.002+.006*(1-t))*Math.sin(a*17+t*5)*Math.sin(t*Math.PI);p.push((rx+fold)*Math.sin(a),y+.004*Math.cos(a*8)*(1-t),(rz+fold)*Math.cos(a)-.017);uv.push(i/cols*3,t*2);if(j<rows&&i<cols){const v=j*(cols+1)+i;idx.push(v,v+cols+1,v+1,v+1,v+cols+1,v+cols+2);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(parent,g,coat);
 for(const s of [-1,1]){
 panel(parent,[[s*.115,1.775,.143],[s*.28,1.72,.18],[s*.337,1.58,.18],[s*.17,1.31,.188],[s*.209,1.58,.221]],coat);
 seam(parent,[[s*.115,1.775,.146],[s*.28,1.72,.184],[s*.337,1.58,.184],[s*.17,1.31,.192]],.0013);
 // Storm flap and shoulder epaulette.
 panel(parent,[[s*.15,1.70,-.188],[s*.34,1.7,-.14],[s*.32,1.48,-.196],[s*.15,1.47,-.205]],coat);
 panel(parent,[[s*.18,1.746,0],[s*.39,1.706,0],[s*.39,1.706,-.085],[s*.18,1.746,-.085]],coat);
 const ep=add(parent,new THREE.CylinderGeometry(.015,.015,.008,12),button,[s*.215,1.755,-.04]);
 for(const y of [1.37,1.15,.94]){const b=add(parent,new THREE.CylinderGeometry(.018,.018,.009,16),button,[s*(.185+(1.37-y)*.12),y,.169]);b.rotation.x=Math.PI/2;for(const dx of [-.004,.004])oval(parent,stitch,[b.position.x+dx,y,.176],[.001,.001,.001]);}
 panel(parent,[[s*.21,1.08,.178],[s*.34,1.12,.105],[s*.35,1.065,.108],[s*.22,1.025,.18]],coat);
 seam(parent,[[s*.21,1.08,.18],[s*.34,1.12,.109]],.002);
 seam(parent,[[s*.30,.57,-.152],[s*.276,1.07,-.159],[s*.21,1.65,-.17]],.0012);
 }
 panel(parent,[[-.29,1.19,-.185],[.29,1.19,-.185],[.29,1.14,-.189],[-.29,1.14,-.189]],coat);
 seam(parent,[[-.28,1.185,-.19],[0,1.185,-.205],[.28,1.185,-.19]],.001);
}
export function createCastiel(){
 const root=new THREE.Group();root.name='Castiel';const body=new THREE.Group();root.add(body);body.scale.x=.84;
 // Slim dark suit below the open trenchcoat.
 oval(body,suit,[0,1.36,-.015],[.25,.396,.164]);
 panel(body,[[-.125,1.80,.148],[.125,1.80,.148],[.105,1.16,.171],[-.105,1.16,.171]],shirt);
 for(const s of [-1,1]){
 panel(body,[[s*.106,1.742,.159],[s*.021,1.701,.185],[s*.072,1.61,.187],[s*.14,1.703,.156]],shirt);
 panel(body,[[s*.15,1.71,.154],[s*.256,1.59,.147],[s*.122,1.24,.177],[s*.069,1.54,.186]],suit);
 seam(body,[[s*.19,1.57,.161],[s*.11,1.31,.18]],.001,suit);
 }
 const tie=new THREE.Group();body.add(tie);tie.position.y=.075;
 panel(tie,[[-.026,1.664,.193],[.022,1.664,.193],[.016,1.608,.201],[-.019,1.61,.201]],tieMat);
 panel(tie,[[-.014,1.617,.195],[.014,1.617,.195],[.035,1.2,.189],[.004,1.155,.189],[-.027,1.2,.189]],tieMat);
 for(const y of [1.53,1.43,1.33])seam(tie,[[-.013,y,.198],[.02,y-.018,.198]],.0007,stitch);
 trench(body);
 
 add(body,new THREE.CylinderGeometry(.064,.065,.18,32),skin,[0,1.80,.015]);
 const collar=add(body,new THREE.CylinderGeometry(.071,.082,.065,32,1,true,.3,Math.PI*2-.6),shirt,[0,1.798,0]);
 for(const side of [-1,1])panel(body,[[side*.019,1.83,.063],[side*.065,1.812,.058],[side*.09,1.73,.156],[side*.028,1.76,.159]],shirt);
 const head=new THREE.Group();head.position.set(0,1.965,0);root.add(head);const eyes=face(head);
 const legs=[];
 for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.139,1.03,0);root.add(leg);
 const pants=add(leg,new THREE.CapsuleGeometry(.105,.73,8,20),suit,[0,-.43,0]);pants.scale.z=.94;
 seam(leg,[[0,-.12,.103],[0,-.43,.098],[0,-.81,.095]],.0018,suit);
 const boot=oval(leg,leather,[0,-.94,.045],[.101,.067,.15]);
 oval(leg,leather,[0,-1.001,.045],[.103,.015,.153]);
 for(let i=0;i<4;i++)seam(leg,[[-.03,-.91+i*.014,.123],[.03,-.905+i*.014,.122]],.002,button);
 batch(leg);legs.push(leg);}
 const arms=[];for(const s of [-1,1]){const arm=makeArm(coat,skin);arm.position.set(s*.285,1.68,0);root.add(arm);arms.push(arm);}
 batch(body);
 const wings=shadowWings();wings.visible=false;root.add(wings);
 root.userData={legs,arms,wings,head,body,tie,eyes};return root;
}
export function animateCastiel(root,time,moving=false,casting=false){
 const {head,body,tie,arms}=root.userData;head.rotation.y=casting?0:Math.sin(time*.55)*.025;head.rotation.x=Math.sin(time*.7)*.008;
 body.scale.y=1+Math.sin(time*1.6)*.0015;tie.rotation.x=Math.sin(time*2)*.015;
 if(!casting){for(let i=0;i<arms.length;i++)arms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.16:Math.sin(time*1.6+i)*.012;}
}
