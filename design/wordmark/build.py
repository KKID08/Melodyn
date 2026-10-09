import json, math
G=json.load(open('glyphs.json'))
k=549.6/28.5
f=lambda n: f'{n:.1f}'
# m mark in font units (y up), stroke style as the logo
def mp(ux,uy): return ((ux-7.75)*k,(54.25-uy)*k)
sw=8.5*k; r=8*k
m=(f'<path d="M{f(mp(12,50)[0])} {f(mp(12,50)[1])}V{f(mp(0,28)[1])}A{f(r)} {f(r)} 0 0 0 {f(mp(28,28)[0])} {f(mp(0,28)[1])}V{f(mp(0,50)[1])}'
   f'M{f(mp(28,38)[0])} {f(mp(0,38)[1])}A{f(r)} {f(r)} 0 0 0 {f(mp(44,38)[0])} {f(mp(0,38)[1])}V{f(mp(0,50)[1])}" fill="none" stroke="#ff5a36" stroke-width="{f(sw)}" stroke-linecap="round" stroke-linejoin="round"/>')
mR=mp(48.25,0)[0]
gap=75; ls=-50
ex0=mR+gap-35   # e origin
# e: left half rebuilt with the m's corner radius, right half from Geist
R=12.25*k; mid=315; L=35; T=550; B=-11; tx=170; it=431; ib=111; cb=(226,321)
M2=mid+3
outer=f'M{M2} {T}H{f(L+R)}A{f(R)} {f(R)} 0 0 1 {L} {f(T-R)}V{f(B+R)}A{f(R)} {f(R)} 0 0 1 {f(L+R)} {B}H{M2}Z'
iL=L+tx; rx=R-tx; ryt=R-(T-it); ryb=R-(ib-B)
inner=f'M{M2} {it}V{ib}H{f(iL+rx)}A{f(rx)} {f(ryb)} 0 0 0 {iL} {f(ib+ryb)}V{f(it-ryt)}A{f(rx)} {f(ryt)} 0 0 0 {f(iL+rx)} {it}Z'
bar=f'M{iL-1} {cb[0]}H{M2}V{cb[1]}H{iL-1}Z'
e=(f'<g transform="translate({f(ex0)} 0)"><defs><clipPath id="eR"><rect x="{mid-3}" y="-200" width="600" height="1000"/></clipPath></defs>'
   f'<path d="{G["e"]["d"]}" clip-path="url(#eR)"/><path d="{outer}{inner}" fill-rule="evenodd"/><path d="{bar}"/></g>')
x=ex0+G['e']['adv']+ls; rest=''
for ch in 'lodyn':
    rest+=f'<path transform="translate({f(x)} 0)" d="{G[ch]["d"]}"/>'; last=x+G[ch]['adv']; x+=G[ch]['adv']+ls
# dot between the two equal curves, a bit raised
c1=(mp(36,38)[0],mp(0,38)[1]); c2=(ex0+L+R,T-R)
rd=89; dist=R+60+rd; h=(c2[0]-c1[0])/2
cy=c1[1]+math.sqrt(dist*dist-h*h); cx=(c1[0]+c2[0])/2
dot=f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{rd}" fill="#ff5a36"/>'
W=last-20
body=f'<g transform="translate(0 720) scale(1 -1)">{m}<g fill="currentColor">{e}{rest}</g>{dot}</g>'
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-90 0 {f(W+110)} 880">{body}</svg>'
open('melodyn-wordmark.svg','w').write(svg)
json.dump({'vb':f'-90 0 {f(W+110)} 880','body':body,'cx':cx,'cy':cy},open('wm.json','w'))
print('W',W,'dot',cx,cy, 'c1',c1,'c2',c2)
