"""Build skin weights for the supplied static Ironvex, preserving its geometry.
Requires numpy. Run: python tools/rig_ironvex.py
Uses surface graph distances so fingers cannot be accidentally bound to the hip.
The generated weights are checked in; this tool is not needed to run the game.
"""
import collections, hashlib, heapq, json, struct
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
raw=(root/'public/models/ironvex.glb').read_bytes()
expected='01c775e47ff5d56896451ff876a3d10c434d6357cf7625818d7711cae8a49dd6'
assert hashlib.sha256(raw).hexdigest()==expected, 'Weights must be regenerated for this exact source asset'
n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=28+n
positions=[];faces=[];offset=0;counts=[]
for mesh in doc['meshes']:
 for primitive in mesh['primitives']:
  a=doc['accessors'][primitive['attributes']['POSITION']];v=doc['bufferViews'][a['bufferView']]
  p=np.frombuffer(raw,dtype='<f4',count=a['count']*3,offset=binary+v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3)
  a=doc['accessors'][primitive['indices']];v=doc['bufferViews'][a['bufferView']]
  f=np.frombuffer(raw,dtype={5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count'],offset=binary+v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3)
  positions.append(p);faces.append(f+offset);offset+=len(p);counts.append(len(p))
p=np.concatenate(positions);triangles=np.concatenate(faces)
minimum=p.min(0);maximum=p.max(0);center=(minimum+maximum)/2
p=(p-np.array([center[0],minimum[1],center[2]]))*(2.7/(maximum[1]-minimum[1]))
unique,first,inverse=np.unique(np.round(p,5),axis=0,return_index=True,return_inverse=True)
coords=p[first];num=len(coords);adjacency=[{}for _ in range(num)]
for face in triangles:
 a,b,c=map(int,inverse[face])
 for x,y in [(a,b),(b,c),(c,a)]:
  if x==y or y in adjacency[x]:continue
  distance=float(np.linalg.norm(coords[x]-coords[y]));adjacency[x][y]=distance;adjacency[y][x]=distance
labels=np.full(num,-1,dtype=np.int16)
for i,(x,y,z) in enumerate(coords):
 a=abs(x);side=0 if x<0 else 1
 if (a<.37 and y>1.46)or(a<.25 and y>1.1):labels[i]=0
 elif a>.62 and 1.96<y<2.52:labels[i]=1+side*2
 elif a>.68 and 1.12<y<1.68:labels[i]=2+side*2
 elif .22<a<.60 and .97<y<1.15:labels[i]=5+side*2
 elif a>.2 and y<.73:labels[i]=6+side*2
fixed=labels>=0;distance=np.full(num,np.inf);queue=[]
for i in np.flatnonzero(fixed):distance[i]=0;heapq.heappush(queue,(0,int(i)))
while queue:
 d,i=heapq.heappop(queue)
 if d>distance[i]+1e-10:continue
 for j,w in adjacency[i].items():
  candidate=d+w
  if candidate<distance[j]:distance[j]=candidate;labels[j]=labels[i];heapq.heappush(queue,(candidate,j))
assert (labels>=0).all()
weights=np.eye(9,dtype=np.float32)[labels]
# Blend only a narrow band along each joint, leaving the armour rigid elsewhere.
a=[];b=[]
for i,neighbors in enumerate(adjacency):
 for j in neighbors:a.append(i);b.append(j)
a=np.asarray(a);b=np.asarray(b);degree=np.bincount(a,minlength=num).clip(1)
for iteration in range(12):
 total=np.zeros_like(weights)
 for bone in range(9):total[:,bone]=np.bincount(a,weights=weights[b,bone],minlength=num)/degree
 weights[~fixed]=.5*weights[~fixed]+.5*total[~fixed]
order=np.argsort(weights,axis=1)[:,-4:][:,::-1];values=np.take_along_axis(weights,order,axis=1);values/=values.sum(axis=1,keepdims=True)
packed=np.round(values*255).astype(np.int16);packed[:,0]+=255-packed.sum(axis=1)
assert (packed>=0).all() and (packed.sum(axis=1)==255).all()
indices=order[inverse].astype(np.uint8);weight_bytes=packed[inverse].astype(np.uint8)
output=root/'public/models/ironvex-skin.bin'
output.write_bytes(struct.pack('<4sI',b'IRIG',len(p))+indices.tobytes()+weight_bytes.tobytes())
print('Unique surface vertices:',num,'source counts:',counts,'weight file:',output.stat().st_size)
