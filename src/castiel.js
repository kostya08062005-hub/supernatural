import * as THREE from 'three';
import headData from './assets/castiel-head.json';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeArm, shadowWings } from './visuals.js';
import { profile, ringSurface, clothLeg, shoeUpper, sole } from './tailoring.js';

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
const coat=weave('#a2a092'),suit=weave('#272f39'),shirt=weave('#e7e5df'),tieMat=weave('#253e61');
const leather=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.72});
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
function sculptHead(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(headData.position.map((v,i)=>{const y=headData.position[i-i%3+1];if(i%3===0)return v*(1+.085*Math.exp(-Math.pow((y+.09)/.035,2))-.025*Math.exp(-Math.pow(y/.04,2)));if(i%3===2&&v>.08)return v+.005*Math.exp(-Math.pow((y-.064)/.025,2));if(i%3===1&&headData.position[i+1]>.10&&Math.abs(headData.position[i-1])<.045&&y<-.04&&y>-.085)return -.062+(y+.062)*.73;return v;}),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(headData.uv,2));const indices=[];for(let j=0;j<headData.index.length;j+=3){const triangle=headData.index.slice(j,j+3);if(triangle.every(v=>headData.position[v*3+1]>-.11||headData.position[v*3+2]>.10))indices.push(...triangle);}g.setIndex(indices);g.computeVertexNormals();const colors=[];for(let i=0;i<headData.position.length;i+=3){const x=headData.position[i],y=headData.position[i+1],z=headData.position[i+2];const front=THREE.MathUtils.smoothstep(z,.06,.11);const lips=Math.exp(-Math.pow(x/.037,4)-Math.pow((y+.061)/.010,4))*front;const beard=Math.exp(-Math.pow((y+.105)/.034,2))*front*.065;const cheek=Math.exp(-Math.pow((Math.abs(x)-.072)/.03,2)-Math.pow((y+.012)/.027,2))*front;colors.push(1-beard-lips*.12,1-beard-lips*.25-cheek*.04,1-beard-lips*.23-cheek*.035);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
function irisTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#263e4b';x.fillRect(0,0,128,128);for(let i=0;i<180;i++){const a=i*Math.PI*2/180;x.strokeStyle=i%3?'#718f9b':'#405f6d';x.lineWidth=1;x.beginPath();x.moveTo(64+Math.cos(a)*15,64+Math.sin(a)*15);x.lineTo(64+Math.cos(a)*57,64+Math.sin(a)*57);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function face(parent){
 const skinMesh=add(parent,sculptHead(),headSkin);skinMesh.name='anatomical-head';
 const eyes=[];const white=new THREE.MeshPhysicalMaterial({color:0xbfc3c0,roughness:.28,clearcoat:.6});
 const irisMat=new THREE.MeshPhysicalMaterial({map:irisTexture(),roughness:.25,clearcoat:.9,side:THREE.DoubleSide});
 for(const s of [-1,1]){const x=s*.0445,y=.041;
 oval(parent,white,[x,y,.088],[.023,.022,.022]);
 const iris=add(parent,new THREE.CircleGeometry(.0082,40),irisMat,[x,y+.001,.1105]);eyes.push(iris);
 add(parent,new THREE.CircleGeometry(.0028,24),new THREE.MeshBasicMaterial({color:0x06090c}),[x,y,.111]);
 oval(parent,new THREE.MeshBasicMaterial({color:0xffffff}),[x-.002,y+.003,.112],[.0015,.0015,.0005]);
 seam(parent,[[x-s*.025,.061,.116],[x,.066,.122],[x+s*.025,.061,.107]],.0015,hair);
 for(let k=0;k<35;k++){const f=k/34-.5;const xx=x+f*.048,yy=.064+Math.cos(f*2.8)*.002;seam(parent,[[xx,yy,.119-Math.abs(f)*.018],[xx+s*.001,yy+.003,.119-Math.abs(f)*.018]],.00045,hair);}
 }
 // Short, irregular hair with a side part; all locks are merged into two draw calls.
 const scalp=new THREE.BufferGeometry(),p=[],uv=[],idx=[];const n=80,m=40;
 const hairCandidates=[];for(let i=0;i<headData.position.length;i+=3)if(headData.position[i+1]>-.04)hairCandidates.push(headData.position[i],headData.position[i+1],headData.position[i+2],Math.atan2(headData.position[i],headData.position[i+2]+.005));
 function hairPoint(a,b){const y=.045+Math.cos(b)*.18;let best=null,bestScore=Infinity;const desiredAngle=a>Math.PI?a-Math.PI*2:a;
 for(let i=0;i<hairCandidates.length;i+=4){const x=hairCandidates[i],yy=hairCandidates[i+1],z=hairCandidates[i+2];let angle=hairCandidates[i+3],diff=Math.abs(angle-desiredAngle);diff=Math.min(diff,Math.PI*2-diff);const score=(yy-y)**2+diff**2*.004;if(score<bestScore){bestScore=score;best=[x,yy,z];}}
 const front=Math.max(0,Math.cos(a));return [best[0]*1.035,best[1]+.006+front*.018*Math.sin(b),best[2]*1.035];}
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,edge=1.65-.50*Math.cos(a);const b=.025+j/m*edge;p.push(...hairPoint(a,b));uv.push(i/n,j/m);if(i<n&&j<m){const v=j*(n+1)+i;idx.push(v,v+n+1,v+1,v+1,v+n+1,v+n+2);}}
 scalp.setAttribute('position',new THREE.Float32BufferAttribute(p,3));scalp.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));scalp.setIndex(idx);scalp.computeVertexNormals();smoothSeam(scalp,m,n);add(parent,scalp,hair);
 for(let i=0;i<180;i++){const a=i*2.39996,b=.15+((i*37)%100)/100*(1.65-.50*Math.cos(a));const [x,y,z]=hairPoint(a,b),front=Math.max(0,Math.cos(a));const lift=.004+front*.015;
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y,z),new THREE.Vector3(x+.003,y+lift,z-.009),new THREE.Vector3(x+.014,y+lift*.6,z-.028)]);
 const g=new THREE.TubeGeometry(path,8,.005+(i%3)*.0015,5,false);const pv=g.attributes.position;for(let k=0;k<pv.count;k++) {const t=Math.floor(k/6)/8,center=path.getPoint(Math.min(1,t));const taper=1-.8*t;pv.setXYZ(k,center.x+(pv.getX(k)-center.x)*taper,center.y+(pv.getY(k)-center.y)*.6*taper,center.z+(pv.getZ(k)-center.z)*taper);}g.computeVertexNormals();add(parent,g,i%5?hair:hairLight);
 }
 batch(parent);return eyes;
}
function coatAt(y){const t=THREE.MathUtils.clamp((y-.65)/1.18,0,1);return {rx:profile([[0,.315],[.35,.287],[.61,.276],[.83,.321],[.91,.328],[.96,.235],[1,.075]],t),rz:profile([[0,.174],[.65,.165],[.88,.181],[.94,.135],[1,.064]],t)};}
function coatFront(x,y){const {rx,rz}=coatAt(y);return rz*Math.sqrt(Math.max(0,1-(x/rx)**2))-.015;}
function trench(parent){
 const geometry=ringSurface(70,80,(t,u)=>{const y=.65+t*1.18,{rx,rz}=coatAt(y),opening=.27+(1-t)*.07,a=opening+u*(Math.PI*2-opening*2);const fold=.002*Math.sin(a*19+t*5)*Math.sin(t*Math.PI)+.0015*Math.sin(a*31-t*13);return [(rx+fold)*Math.sin(a),y,(rz+fold)*Math.cos(a)-.015];});add(parent,geometry,coat);
 for(const side of [-1,1]){
  // Notched collar follows the chest rather than forming a floating flat triangle.
  const lapel=[[side*.073,1.82,.059],[side*.18,1.76,.118],[side*.265,1.64,.135],[side*.12,1.40,.17],[side*.15,1.63,.181]];
  panel(parent,lapel,coat);seam(parent,lapel.slice(0,4).map(([x,y,z])=>[x,y,z+.002]),.0009);
  panel(parent,[[side*.075,1.82,-.045],[side*.275,1.72,-.10],[side*.29,1.61,-.143],[side*.13,1.67,-.17]],coat);
  panel(parent,[[side*.13,1.785,-.035],[side*.315,1.718,-.025],[side*.315,1.718,-.075],[side*.13,1.785,-.075]],coat);
  const shoulderButton=add(parent,new THREE.CylinderGeometry(.009,.009,.003,16),button,[side*.16,1.78,-.052]);
  for(const y of [1.50,1.32,1.12,.94]){const x=side*(.163+(1.5-y)*.035),z=coatFront(x,y);const b=add(parent,new THREE.CylinderGeometry(.0105,.0105,.003,20),button,[x,y,z+.005]);b.rotation.x=Math.PI/2;}
  const pocket=[[side*.19,1.08,coatFront(side*.19,1.08)+.005],[side*.265,1.13,coatFront(side*.265,1.13)+.005],[side*.27,1.105,coatFront(side*.27,1.105)+.006],[side*.195,1.055,coatFront(side*.195,1.055)+.006]];
  panel(parent,pocket,coat);seam(parent,pocket.slice(0,2),.001);
  seam(parent,[[side*.28,.66,-.105],[side*.257,1.08,-.11],[side*.21,1.61,-.13]],.0008);
 }
 // Narrow back belt, centre seam and a single storm yoke.
 panel(parent,[[-.19,1.22,-.16],[.19,1.22,-.16],[.19,1.18,-.166],[-.19,1.18,-.166]],coat);
 for(const x of [-.15,.15]){const b=add(parent,new THREE.CylinderGeometry(.009,.009,.003,16),button,[x,1.20,-.17]);b.rotation.x=Math.PI/2;}
 seam(parent,[[0,.66,-.19],[0,1.17,-.183],[0,1.58,-.19]],.0008);
}
function shirtFront(parent){
 for(const side of [-1,1]){const g=ringSurface(30,12,(t,u)=>{const y=1.12+t*.69,opening=t>.70?(t-.70)/.30*.055:.002;const x=side*(opening+u*(.12-opening));return [x,y,.177-Math.pow(x/.17,2)*.018+.0015*Math.sin(y*65+x*20)];});add(parent,g,shirt);
  panel(parent,[[side*.048,1.815,.069],[side*.11,1.78,.148],[side*.075,1.68,.182],[side*.024,1.755,.158]],shirt);
 }
 for(const y of [1.22,1.34,1.46,1.58]){const b=add(parent,new THREE.SphereGeometry(.0033,8,6),shirt,[0,y,.183]);b.scale.z=.4;}
}
export function createCastiel(){
 const root=new THREE.Group();root.name='Castiel';const body=new THREE.Group();root.add(body);body.scale.x=.84;
 // Shirt tucked into dark trousers, with an open collar as in the reference.
 oval(body,suit,[0,1.34,-.015],[.249,.36,.16]);
 panel(body,[[-.057,1.84,.065],[.057,1.84,.065],[.055,1.75,.139],[0,1.65,.177],[-.055,1.75,.139]],skin);
 shirtFront(body);
 const belt=add(body,new THREE.CylinderGeometry(.25,.25,.036,48),leather,[0,1.115,-.01]);belt.scale.z=.65;
 panel(body,[[-.02,1.133,.16],[.02,1.133,.16],[.02,1.10,.16],[-.02,1.10,.16]],button);
 const tie=new THREE.Group();body.add(tie);tie.position.y=.075;tie.visible=false;
 panel(tie,[[-.026,1.664,.193],[.022,1.664,.193],[.016,1.608,.201],[-.019,1.61,.201]],tieMat);
 panel(tie,[[-.014,1.617,.195],[.014,1.617,.195],[.035,1.2,.189],[.004,1.155,.189],[-.027,1.2,.189]],tieMat);
 for(const y of [1.53,1.43,1.33])seam(tie,[[-.013,y,.198],[.02,y-.018,.198]],.0007,stitch);
 trench(body);
 
 add(body,new THREE.CylinderGeometry(.064,.065,.18,32),skin,[0,1.80,.015]);
 const head=new THREE.Group();head.position.set(0,1.965,0);root.add(head);const eyes=face(head);
 const legs=[];
 for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.115,1.03,0);root.add(leg);
 add(leg,clothLeg(),suit);
 seam(leg,[[0,-.1,.099],[0,-.45,.079],[0,-.87,.057]],.0007,suit);
 add(leg,shoeUpper(),leather,[0,-.959,0]);add(leg,sole(),leather,[0,-1.004,0]);
 seam(leg,[[-.07,-.986,.10],[0,-.99,.19],[.07,-.986,.10]],.001,button);
 for(let i=0;i<4;i++)seam(leg,[[-.022,-.89-i*.008,-.012+i*.018],[.022,-.89-i*.008,-.012+i*.018]],.0012,button);
 batch(leg);legs.push(leg);}
 const arms=[];for(const s of [-1,1]){const arm=makeArm(coat,skin);arm.position.set(s*.25,1.715,0);arm.scale.setScalar(.83);root.add(arm);arms.push(arm);}
 batch(body);
 const wings=shadowWings();wings.visible=false;root.add(wings);
 root.userData={legs,arms,wings,head,body,tie,eyes};return root;
}
export function animateCastiel(root,time,moving=false,casting=false){
 const {head,body,tie,arms}=root.userData;head.rotation.y=casting?0:Math.sin(time*.55)*.025;head.rotation.x=Math.sin(time*.7)*.008;
 body.scale.y=1+Math.sin(time*1.6)*.0015;tie.rotation.x=Math.sin(time*2)*.015;
 if(!casting){for(let i=0;i<arms.length;i++)arms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.16:Math.sin(time*1.6+i)*.012;}
}
