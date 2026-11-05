"""Extract the CC0 MakeHuman hm08 head and subdivide once; no body data is retained.
Usage: python tools/build_head.py /path/to/makehuman/data/3dobjs/base.obj
Source and license: THIRD_PARTY.md
"""
import json, math, sys
from collections import defaultdict
from pathlib import Path
vertices=[]; faces=[]; group=''
for line in Path(sys.argv[1]).read_text().splitlines():
 if line.startswith('v '): vertices.append(tuple(map(float,line.split()[1:4])))
 elif line.startswith('g '): group=line[2:]
 elif line.startswith('f ') and group=='body':
  face=[int(part.split('/')[0])-1 for part in line.split()[1:]]
  if all(vertices[i][1]>5.8 for i in face): faces.append(face)
used=sorted({i for f in faces for i in f}); lookup={v:i for i,v in enumerate(used)}
vertices=[vertices[i] for i in used]; faces=[[lookup[v] for v in f] for f in faces]
def average(vs):return tuple(sum(p[i] for p in vs)/len(vs) for i in range(3))
# Catmull-Clark preserves the original quad loops around eyes, nose and lips.
face_points=[average([vertices[v] for v in f]) for f in faces]
edges=defaultdict(list); vertex_faces=defaultdict(list); vertex_edges=defaultdict(set)
for index,f in enumerate(faces):
 for i,a in enumerate(f):
  b=f[(i+1)%len(f)]; edge=tuple(sorted((a,b)));edges[edge].append(index);vertex_faces[a].append(index);vertex_edges[a].add(edge);vertex_edges[b].add(edge)
new=[]
for i,p in enumerate(vertices):
 boundary=[e for e in vertex_edges[i] if len(edges[e])==1]
 if boundary:
  neighbors=[vertices[e[1] if e[0]==i else e[0]] for e in boundary];n=average(neighbors);new.append(tuple(p[k]*.75+n[k]*.25 for k in range(3)))
 else:
  fs=vertex_faces[i];n=len(fs);F=average([face_points[j] for j in fs]);R=average([average([vertices[a],vertices[b]]) for a,b in vertex_edges[i]])
  new.append(tuple((F[k]+2*R[k]+(n-3)*p[k])/n for k in range(3)))
edge_indices={}
for edge,fs in edges.items():
 edge_indices[edge]=len(new);new.append(average([vertices[i] for i in edge]+[face_points[i] for i in fs]) if len(fs)>1 else average([vertices[i] for i in edge]))
face_offset=len(new);new+=face_points
triangles=[]
for index,f in enumerate(faces):
 for j,a in enumerate(f):
  quad=[a,edge_indices[tuple(sorted((a,f[(j+1)%len(f)])))],face_offset+index,edge_indices[tuple(sorted((f[j-1],a)))]]
  triangles+=quad[:3]+[quad[0],quad[2],quad[3]]
positions=[];uvs=[]
for x,y,z in new:
 px=x*.143;py=(y-7)*.143;pz=(z-.65)*.143
 # A slightly wider jaw and narrower cheeks; this is a likeness study, not a scan of the actor.
 px*=1+.14*math.exp(-((py+.09)/.045)**2)
 if py<-.10:
  shrink=1-.6*min(1,(-py-.10)/.065);px*=shrink;pz=.02+(pz-.02)*shrink
 # Slightly thinner lips for the adult male fitting.
 if abs(px)<.05 and -.082<py<-.042 and pz>.10: py=-.062+(py+.062)*.83
 positions += [round(px,6),round(py,6),round(pz,6)]
 uvs += [round(.5+math.atan2(px,pz+.045)/(2*math.pi),6),round((py+.18)/.4,6)]
out=Path(__file__).resolve().parents[1]/'src/assets/castiel-head.json'
out.write_text(json.dumps({'position':positions,'uv':uvs,'index':triangles},separators=(',',':')))
print(len(new),'head vertices;',len(triangles)//3,'triangles;',out.stat().st_size,'bytes')
