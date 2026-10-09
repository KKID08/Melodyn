# Melodyn wordmark: Geist 780 letters + logo m, with the e's left side matching the m's arch radius.
# Everything is built as real geometry (shapely) so the e halves fuse without seams, then all outlines get the
# same small corner rounding: convex corners radius CV, concave corners (crotches, counters) radius CC.
import math, json
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity

font=TTFont('geist780.ttf'); gs=font.getGlyphSet(); cmap=font.getBestCmap()
class Flat(BasePen):
    def __init__(s,gs): super().__init__(gs); s.rings=[]; s.cur=[]
    def _moveTo(s,p): s.cur=[p]
    def _lineTo(s,p): s.cur.append(p)
    def _curveToOne(s,a,b,c):
        p0=s.cur[-1]
        for i in range(1,65):
            t=i/64; u=1-t
            s.cur.append((u**3*p0[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*c[0],u**3*p0[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*c[1]))
    def _qCurveToOne(s,a,b):
        p0=s.cur[-1]
        for i in range(1,49):
            t=i/48; u=1-t; s.cur.append((u*u*p0[0]+2*u*t*a[0]+t*t*b[0],u*u*p0[1]+2*u*t*a[1]+t*t*b[1]))
    def _closePath(s):
        if len(s.cur)>2: s.rings.append(s.cur)
        s.cur=[]
    _endPath=_closePath
from fontTools.pens.recordingPen import RecordingPen
# Geist's ink traps (tiny notches at junctions) become dents once corners are rounded; join those strokes directly.
PATCH={
 'n':[(((212,538),),((212,538),)),(((219,374),),None),(((199,378),),((212,378),)),
      (((206,442),(255,517),(329,550),(374,550)),((213,442),(255,517),(329,550),(374,550)))],
 'd':[(((421,0),),((415,0),)),(((418,78),),((415,78),))],
 'y':[(((211,-28),(235,-13),(242,6)),((229.9,-28),(221.3,-5))),(((252,31),),None),(((208,31),),None)],
}
def glyph(ch):
    rp=RecordingPen(); gs[cmap[ord(ch)]].draw(rp)
    ops=[]
    for op,args in rp.value:
        key=tuple(tuple(round(v) for v in a) for a in args); rep=key
        for old,new in PATCH.get(ch,[]):
            if key==old: rep=new
        if rep is None: continue
        ops.append((op,rep if rep!=key else args))
    p=Flat(gs)
    for op,args in ops: getattr(p,op)(*args)
    from shapely.geometry import LinearRing
    rings=[(LinearRing(r).is_ccw,Polygon(r).buffer(0)) for r in p.rings]
    big=max(rings,key=lambda t:t[1].area)[0]
    solid=unary_union([q for o,q in rings if o==big]); holes=unary_union([q for o,q in rings if o!=big])
    g=solid.difference(holes)   # nonzero winding: overlapping outer contours merge
    return g, font['hmtx'][cmap[ord(ch)]][0]

k=549.6/28.5
def mp(ux,uy): return ((ux-7.75)*k,(54.25-uy)*k)
sw=8.5*k; rr=8*k
def arcpts(cx,cy,R,a0,a1,n=40): return [(cx+R*math.cos(a0+(a1-a0)*i/n),cy+R*math.sin(a0+(a1-a0)*i/n)) for i in range(n+1)]
# m centerlines (y up): stem up, arch over, stem down
l1=[mp(12,50)]+arcpts(mp(20,28)[0],mp(0,28)[1],rr,math.pi,0)+[mp(28,50)]
l2=[mp(28,38)]+arcpts(mp(36,38)[0],mp(0,38)[1],rr,math.pi,0)+[mp(44,50)]
M=unary_union([LineString(l1).buffer(sw/2,quad_segs=32),LineString(l2).buffer(sw/2,quad_segs=32)])
mR=mp(48.25,0)[0]
gap=75; ls=-50; ex0=mR+gap-35

# e: right half from Geist, left half rebuilt with the m's outer arch radius R
eg,eadv=glyph('e')
R=12.25*k; mid=315; L=35; tx=170
# read the exact heights of Geist's strokes at the seam so both halves meet flush
_cut=eg.intersection(LineString([(mid,-300),(mid,900)]))
_ys=sorted(y for seg in getattr(_cut,'geoms',[_cut]) for y in (seg.coords[0][1],seg.coords[-1][1]))
B,ib,cb0,cb1,it,T=_ys; cb=(cb0,cb1)
print('seam',_ys)
def rrect_left(x0,x1,y0,y1,rx,ryt,ryb):
    parts=[box(x0+rx,y0,x1,y1), box(x0,y0+ryb,x1,y1-ryt)]
    parts.append(affinity.translate(affinity.scale(Point(0,0).buffer(1,quad_segs=64),rx,ryt),x0+rx,y1-ryt))
    parts.append(affinity.translate(affinity.scale(Point(0,0).buffer(1,quad_segs=64),rx,ryb),x0+rx,y0+ryb))
    return unary_union(parts).intersection(box(x0,y0,x1,y1))
iL=L+tx
outer=rrect_left(L,mid+40,B,T,R,R,R)
inner=rrect_left(iL,mid+60,ib,it,95,117,114)
left=outer.difference(inner).union(box(iL-2,cb[0],mid+40,cb[1])).intersection(box(L-5,B-5,mid,T+5))
E=unary_union([eg.intersection(box(mid-2,-300,900,900)),left]).buffer(0.5).buffer(-0.5)
E=affinity.translate(E,ex0,0)

letters=[]; x=ex0+eadv+ls
for ch in 'lodyn':
    g,adv=glyph(ch); letters.append(affinity.translate(g,x,0)); last=x+adv; x+=adv+ls

CV,CC,TRAP=16,5,5
def soften(g): return g.buffer(-CV,quad_segs=16).buffer(CV,quad_segs=16).buffer(CC,quad_segs=16).buffer(-CC,quad_segs=16)
# soften each letter on its own so neighbours never merge
def soften_parts(g): return unary_union([soften(p) for p in (g.geoms if hasattr(g,'geoms') else [g])])
# Geist's small ink traps at junctions read as dents at logo size: close them with a larger radius (not on the e,
# whose open aperture would close up)
def soften2(g,cc): return g.buffer(-CV,quad_segs=16).buffer(CV,quad_segs=16).buffer(cc,quad_segs=16).buffer(-cc,quad_segs=16)
TEXT=unary_union([soften2(E,CC)]+[soften2(g,{4:14,2:10}.get(i,TRAP)) for i,g in enumerate(letters)]); M=soften2(M,TRAP)

c1=(mp(36,38)[0],mp(0,38)[1]); c2=(ex0+L+R,T-R)
rd=89; dist=R+60+rd; h=(c2[0]-c1[0])/2
cy=c1[1]+math.sqrt(dist*dist-h*h); cx=(c1[0]+c2[0])/2

def d(g):
    out=[]
    for p in (g.geoms if hasattr(g,'geoms') else [g]):
        for ring in [p.exterior]+list(p.interiors):
            c=list(ring.coords); out.append('M'+'L'.join(f'{a:.1f} {b:.1f}' for a,b in c[:-1])+'Z')
    return ''.join(out)
W=last-20
body=(f'<g transform="translate(0 720) scale(1 -1)"><path d="{d(M)}" fill="#ff5a36"/>'
      f'<path d="{d(TEXT)}" fill="currentColor"/><circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rd}" fill="#ff5a36"/></g>')
vb=f'-90 -40 {W+110:.1f} 920'
open('melodyn-wordmark.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>')
json.dump({'vb':vb,'body':body},open('wm.json','w'))
print('ok',len(body))
