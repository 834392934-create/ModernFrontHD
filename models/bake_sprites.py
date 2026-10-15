"""Bake the actual CAD assembly triangles into transparent 16-view game atlases.
Uses deterministic CPU rasterization; runtime needs no Python or CAD dependency."""
import json,math,sys
from pathlib import Path
from PIL import Image,ImageDraw
from model_library import make_model

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets'/'sprites';OUT.mkdir(parents=True,exist_ok=True)
MESH=ROOT/'assets'/'meshes';MESH.mkdir(parents=True,exist_ok=True)
KINDS=['tank','tank_usa','tank_rus','tank_chn','tank_ind','tank_kor','tank_imp','destroyer','fighter','satellite','orbital','defense']
VIEWS=16;CELL=192;SS=2

def vec(v):return(v.X,v.Y,v.Z)
def bake(kind):
    shape=make_model(kind);tri=[];allv=[];mesh_parts=[]
    for child in shape.children:
        vertices,faces=child.tessellate(1.0,0.22);vertices=[vec(v) for v in vertices];allv+=vertices
        color=tuple(child.color) if child.color else (.5,.6,.5,1)
        mesh_parts.append({'name':child.label,'p':[round(v,4) for p in vertices for v in p],'i':[i for f in faces for i in f],'c':list(color[:3])})
        for face in faces:
            a,b,c=(vertices[i] for i in face)
            u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
            n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);norm=math.sqrt(sum(k*k for k in n)) or 1
            tri.append((a,b,c,tuple(k/norm for k in n),color))
    span=max(max(abs(v[0]) for v in allv)*2,max(abs(v[1]) for v in allv)*2,max(v[2] for v in allv)*1.8)
    scale=CELL*.76/span*SS;atlas=Image.new('RGBA',(CELL*VIEWS,CELL))
    for frame in range(VIEWS):
        ang=frame*math.tau/VIEWS;co=math.cos(ang);si=math.sin(ang)
        def project(p):
            x,y,z=p;rx=x*co-y*si;ry=x*si+y*co
            return(CELL*SS/2+rx*scale,CELL*SS*.58+ry*scale*.73-z*scale*.55,ry*.55+z*.73)
        render=Image.new('RGBA',(CELL*SS,CELL*SS));draw=ImageDraw.Draw(render)
        # Ground-contact shadow accompanies the geometry and tracks the light direction.
        shadow=Image.new('RGBA',render.size);sd=ImageDraw.Draw(shadow)
        triangles=[]
        for a,b,c,n,color in tri:
            pts=[project(p) for p in (a,b,c)];depth=sum(p[2] for p in pts)/3
            nx=n[0]*co-n[1]*si;ny=n[0]*si+n[1]*co;nz=n[2]
            brightness=.43+.57*max(0,-nx*.40-ny*.35+nz*.84)
            rgb=tuple(max(0,min(255,int(v*255*brightness))) for v in color[:3])+(255,)
            triangles.append((depth,[(p[0],p[1]) for p in pts],rgb))
            sh=[]
            for p in (a,b,c):
                x,y,z=p;rx=x*co-y*si;ry=x*si+y*co
                sh.append((CELL*SS/2+(rx+z*.45)*scale,CELL*SS*.58+(ry+z*.65)*scale*.73))
            sd.polygon(sh,fill=(5,14,19,70))
        render.alpha_composite(shadow)
        for depth,points,rgb in sorted(triangles,key=lambda v:v[0]):draw.polygon(points,fill=rgb)
        render=render.resize((CELL,CELL),Image.Resampling.LANCZOS);atlas.paste(render,(frame*CELL,0))
    atlas.save(OUT/(kind+'.png'),optimize=True)
    (MESH/(kind+'.js')).write_text('window.CADMeshes=window.CADMeshes||{};window.CADMeshes['+json.dumps(kind)+']='+json.dumps(mesh_parts,separators=(',',':'))+';',encoding='utf8')
    # Large still review image accompanies the compact runtime atlas.
    atlas.crop((CELL*2,0,CELL*3,CELL)).resize((768,768),Image.Resampling.LANCZOS).save(ROOT/'screenshots'/('model-'+kind+'.png'))
    b=shape.bounding_box();return{'kind':kind,'components':len(shape.children),'triangles':len(tri),'valid':shape.is_valid,'bbox_mm':[b.size.X,b.size.Y,b.size.Z],'sprite':f'assets/sprites/{kind}.png','views':VIEWS,'cell':CELL}

if __name__=='__main__':
    previous=ROOT/'docs'/'model-build-report.json'
    report=json.loads(previous.read_text(encoding='utf8')) if previous.exists() else []
    for kind in (sys.argv[1:] or KINDS):
        result=bake(kind);report=[r for r in report if r['kind']!=kind];report.append(result);print(json.dumps(result),flush=True)
    (ROOT/'docs'/'model-build-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
