# Melodyn wordmark, built from one monoline system:
#   stroke w, single corner radius r, verticals/horizontals only, round caps & joins.
import json
w=8; r=9; yX=24; yB=50; yA=6; yD=66; yM=16   # yM: the logo's raised first arch
def f(n): return f'{n:g}'
def arcR(x,y): return f'A{r} {r} 0 0 1 {f(x)} {f(y)}'   # clockwise (screen)
def arcL(x,y): return f'A{r} {r} 0 0 0 {f(x)} {f(y)}'
L={}
def m(x):
    a=x; b=x+2*r; c=x+4*r
    return (f'M{f(a)} {yB}V{yM+r}{arcR(b,yM+r)}V{yB}'
            f'M{f(b)} {yX+r}{arcR(c,yX+r)}V{yB}'), c
def bowl(x0,wd):  # rounded box outline pieces for o/e/d
    return x0, x0+wd
def o(x):
    x0,x1=x,x+22
    return (f'M{f(x0)} {yX+r}{arcR(x0+r,yX)}H{f(x1-r)}{arcR(x1,yX+r)}V{yB-r}{arcR(x1-r,yB)}H{f(x0+r)}{arcR(x0,yB-r)}Z'), x1
def e(x):
    x0,x1=x,x+22; mid=(yX+yB)/2
    return (f'M{f(x0)} {f(mid)}H{f(x1)}V{yX+r}{arcL(x1-r,yX)}H{f(x0+r)}{arcL(x0,yX+r)}V{yB-r}{arcL(x0+r,yB)}H{f(x1-r)}'), x1
def l(x):
    return f'M{f(x)} {yA}V{yB-r}{arcL(x+r,yB)}', x+r
def d(x):
    x0,x1=x,x+22
    return (f'M{f(x1)} {yA}V{yB-r}{arcR(x1-r,yB)}H{f(x0+r)}{arcR(x0,yB-r)}V{yX+r}{arcR(x0+r,yX)}H{f(x1-r)}{arcR(x1,yX+r)}'), x1
def y(x):
    x0,x1=x,x+22
    return (f'M{f(x0)} {yX}V{yB-r}{arcL(x0+r,yB)}H{f(x1-r)}{arcL(x1,yB-r)}M{f(x1)} {yX}V{yD-r}{arcR(x1-r,yD)}H{f(x0)}'), x1
def n(x):
    return f'M{f(x)} {yB}V{yX+r}{arcR(x+2*r,yX+r)}V{yB}', x+2*r
# spacing between centerline extremes (ink gap + w): straight|straight 10, straight|round 9, round|round 8
SS,SR,RR=10+w,9+w,8+w
x=0; parts={}
parts['m'],x=m(0)
ex=x+SR;            parts['e'],x=e(ex)
lx=x+SR;            parts['l'],x=l(lx)
ox=lx+SS+2;         parts['o'],x=o(ox)
dx=x+RR;            parts['d'],x=d(dx)
yx=x+SS;            parts['y'],x=y(yx)
nx=x+SS;            parts['n'],x=n(nx)
# dot: centred between the m's right arch and the e's top-left corner (same radius), raised
c1x=4*r-r; c2x=ex+r; cy=yX+r
dotx=(c1x+c2x)/2; gap=3.5; R=r+w/2; rd=5.2
import math
h=(c2x-c1x)/2; dist=R+gap+rd; doty=cy-math.sqrt(max(dist*dist-h*h,0))
FIL=2.6; R2=r+w/2
def cc(c1,c2,up=True):   # fillet between two outer circles of radius R2
    (ax,ay),(bx,by)=c1,c2; D=math.hypot(bx-ax,by-ay); q=R2+FIL
    mx,my=(ax+bx)/2,(ay+by)/2; hh=math.sqrt(q*q-(D/2)**2); ux,uy=(bx-ax)/D,(by-ay)/D; nx_,ny_=-uy,ux
    s_=-1 if (ny_>0)==up else 1; fx,fy=mx+s_*nx_*hh,my+s_*ny_*hh
    hx=math.sqrt(R2*R2-(D/2)**2); Xx,Xy=mx+s_*nx_*hx,my+s_*ny_*hx
    t1=(ax+(fx-ax)*R2/q,ay+(fy-ay)*R2/q); t2=(bx+(fx-bx)*R2/q,by+(fy-by)*R2/q)
    return f'M{t1[0]:.3f} {t1[1]:.3f}A{FIL} {FIL} 0 0 0 {t2[0]:.3f} {t2[1]:.3f}L{t2[0]:.3f} {t2[1]+1.2:.3f}L{Xx:.3f} {Xy+1.5:.3f}L{t1[0]:.3f} {t1[1]+1.2:.3f}Z'
def lc(lx,ink_right,c,up):  # fillet between a vertical stem edge x=lx and an outer circle
    cx_,cy_=c; q=R2+FIL; fx=lx-FIL if ink_right else lx+FIL
    dy=math.sqrt(q*q-(fx-cx_)**2); fy=cy_-dy if up else cy_+dy
    dX=math.sqrt(R2*R2-(lx-cx_)**2); Xy=cy_-dX if up else cy_+dX
    t1=(lx,fy); t2=(cx_+(fx-cx_)*R2/q,cy_+(fy-cy_)*R2/q)
    sw=1 if (ink_right==up) else 0
    o_=0.6 if ink_right else -0.6; i_=1.2 if up else -1.2
    return f'M{t1[0]:.3f} {t1[1]:.3f}A{FIL} {FIL} 0 0 {sw} {t2[0]:.3f} {t2[1]:.3f}L{t2[0]+o_:.3f} {t2[1]+i_:.3f}L{lx+o_:.3f} {Xy+i_:.3f}L{lx+o_:.3f} {t1[1]:.3f}Z'
fm=cc((r,yM+r),(3*r,yX+r),up=True)
fd=lc(dx+22-w/2,True,(dx+22-r,yX+r),up=True)
fy_=lc(yx+22-w/2,True,(yx+22-r,yB-r),up=False)
RI=r-w/2; FI=1.8
def inner(cx,cy,Ly,sx,sy):   # soften a counter corner where a straight edge meets an inner curve
    d_=math.sqrt((RI-FI)**2-FI**2); fcx,fcy=cx+sx*d_,Ly+sy*FI
    tc=(cx+(fcx-cx)*RI/(RI-FI),cy+(fcy-cy)*RI/(RI-FI)); tl=(fcx,Ly); co=(cx+sx*RI,Ly)
    s1,s2=(0,1) if sx*sy<0 else (1,0)
    k_=(RI+0.6)/RI; to=(cx+(tc[0]-cx)*k_,cy+(tc[1]-cy)*k_); cout=(cx+sx*(RI+0.6),Ly-sy*0.6)
    return (f'M{cout[0]:.3f} {cout[1]:.3f}L{to[0]:.3f} {to[1]:.3f}L{tc[0]:.3f} {tc[1]:.3f}A{FI} {FI} 0 0 {s2} {tl[0]:.3f} {tl[1]:.3f}'
            f'L{tl[0]:.3f} {Ly-sy*0.6:.3f}Z')
mid=(yX+yB)/2
fe=inner(ex+22-r,yX+r,mid-w/2,1,-1)+inner(ex+r,yX+r,mid-w/2,-1,-1)+inner(ex+r,yB-r,mid+w/2,-1,1)
W=x+w/2
st=f'fill="none" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
body=(f'<path d="{parts["m"]}" {st} stroke="#ff5a36"/>'
      f'<path d="{"".join(parts[k] for k in "elodyn")}" {st} stroke="currentColor"/>'
      f'<path d="{fm}" fill="#ff5a36"/><path d="{fd}{fy_}{fe}" fill="currentColor"/>'
      f'<circle cx="{dotx:.2f}" cy="{doty:.2f}" r="{rd}" fill="#ff5a36"/>')
vb=f'{-w/2} {yA-w/2} {W+w/2} {yD-yA+w}'
open('melodyn-wordmark.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>')
json.dump({'vb':vb,'body':body},open('wm.json','w'))
print(vb, 'dot',dotx,doty, {k:v for k,v in [('e',ex),('l',lx),('o',ox),('d',dx),('y',yx),('n',nx)]})
