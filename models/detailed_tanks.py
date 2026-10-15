"""Public-photo-informed exterior studies. These are not measured replicas.
Visual scale only, no internal weapon mechanisms or manufacturing dimensions.
References and visible-feature choices are in MODEL_REFERENCES.md.
"""
import math
from build123d import Box,Cylinder,Ellipse,Polygon,extrude,loft,Pos,Rot,Color,Compound

COLORS={'usa':((.54,.49,.36),(.64,.58,.43)), 'chn':((.28,.36,.27),(.40,.46,.33)), 'rus':((.29,.35,.25),(.43,.46,.32)), 'ind':((.36,.38,.25),(.52,.50,.32)), 'kor':((.28,.33,.27),(.46,.47,.35)), 'imp':((.29,.33,.38),(.51,.54,.57))}
BLACK=(.09,.115,.10);STEEL=(.30,.34,.31);GLASS=(.11,.21,.25);RUBBER=(.115,.13,.115);DUST=(.40,.36,.26)

def make_tank(faction='chn'):
    body,light=COLORS[faction];parts=[]
    def add(shape,name,color=body):shape.label=name;shape.color=Color(*color);parts.append(shape);return shape
    def box(name,x,y,z,l,w,h,color=body,rot=(0,0,0)):return add(Pos(x,y,z)*Rot(*rot)*Box(l,w,h),name,color)
    def cyl(name,x,y,z,r,h,color=body,rot=(0,0,0)):return add(Pos(x,y,z)*Rot(*rot)*Cylinder(r,h),name,color)
    def panel(name,p0,z0,p1,z1,color=body):
        return add(loft([Pos(0,0,z0)*Polygon(*p0,align=None),Pos(0,0,z1)*Polygon(*p1,align=None)]),name,color)
    def polygon(name,p,z,h,color=body):return add(Pos(0,0,z)*extrude(Polygon(*p,align=None),amount=h),name,color)
    lower=[(-46,-18),(34,-18),(47,-12),(47,12),(34,18),(-46,18)]
    upper=[(-45,-21),(20,-21),(45,-16),(45,16),(20,21),(-45,21)]
    panel('hull_lower_cast_envelope',lower,6,upper,18,body)
    panel('upper_hull_sloped_glacis',upper,18,[(-44,-21),(8,-21),(31,-15),(31,15),(8,21),(-44,21)],24,light)
    box('rear_engine_deck',-29,0,24,28,39,1.5,body)
    # Each side has dark rubber tyres, separate steel rims, hubs and face bolts.
    count=7 if faction=='usa' else 6
    for side in (-1,1):
        y=side*24
        box('track_backing',0,y,10,88,8,14,BLACK)
        for j in range(count):
            x=-33+j*66/(count-1)
            cyl('rubber_roadwheel',x,y,10,6.7,8,RUBBER,(90,0,0))
            cyl('steel_wheel_face',x,y+side*4.2,10,5.35,.8,body,(90,0,0))
            cyl('wheel_hub',x,y+side*4.8,10,2.05,1.6,STEEL,(90,0,0))
            for k in range(4):
                a=k*math.pi/2;cyl('hub_bolt',x+math.cos(a)*3.4,y+side*4.8,10+math.sin(a)*3.4,.35,.65,light,(90,0,0))
        for x in (-44,44):
            cyl('sprocket_idler',x,y,11,5.5,8,STEEL,(90,0,0))
            cyl('sprocket_hub',x,y+side*4.7,11,2,1,body,(90,0,0))
        for j in range(28):
            x=-45+j*3.33
            box('track_shoe_upper',x,y,18.6,2.8,9.2,1.45,STEEL)
            box('track_shoe_lower',x,y,2,2.8,9.2,1.6,DUST)
            box('track_cleat',x,y,19.5,.8,9.8,.5,BLACK)
        for x in (-47,47):
            for z in (5,9,13,17):box('track_end_shoe',x,y,z,1.8,9.1,2.7,STEEL)
        # Thin, articulated skirts hide the top of the road wheels, rather than a solid slab.
        for j in range(7):
            x=-39+j*12.5
            box('segmented_side_skirt',x,side*29,19,11.8,1.6,12.5,light if j%3==0 else body)
            box('skirt_top_rail',x,side*29.9,25.1,11.8,1,1.1,STEEL)
            for xx in (-4.3,4.3):cyl('skirt_bolt',x+xx,side*30,23.1,.38,.4,STEEL,(90,0,0))
        box('rear_mudflap',-47,side*24,9,1,9,15,BLACK)
        box('front_mudguard',44,side*24,22,11,10,1.1,body,(0,12,0))
    for j in range(12):
        x=-41+j*2;box('engine_grille_slit',x,0,25,1.0,25,.5,BLACK)
    box('rear_exhaust_grille',-46,0,16,1,28,9,BLACK)
    for y in (-11,0,11):box('exhaust_horizontal_louvre',-46.8,y,16,1,1,8,STEEL)
    cyl('turret_race',-1,0,25,16.5,2.7,BLACK)
    if faction in ('rus','ind'):
        # Low cast-turret form plus a separate bustle and external ERA visual modules.
        add(loft([Pos(-2,0,27)*Ellipse(21,18),Pos(-2,0,32)*Ellipse(17,15),Pos(-2,0,36)*Ellipse(12,11)]),'cast_turret_envelope',body)
        box('turret_bustle',-22,0,30,18,26,10,body)
        for side in (-1,1):
            for i in range(4):box('frontal_ERA_wedge',10+i*3.6,side*(8+i*2.3),31,7,6,5,light,(0,18,side*35))
            for i in range(4):box('turret_side_ERA',-13+i*7,side*17.2,31,6,3,6,body,(0,0,side*8))
    else:
        if faction=='usa':
            bottom=[(-31,-18),(11,-21),(29,-10),(29,10),(11,21),(-31,18)];top=[(-27,-15),(7,-16),(24,-8),(24,8),(7,16),(-27,15)];roof=38
        elif faction=='kor':
            bottom=[(-27,-16),(11,-20),(28,-10),(28,10),(11,20),(-27,16)];top=[(-23,-14),(7,-14),(23,-7),(23,7),(7,14),(-23,14)];roof=35
        elif faction=='imp':
            bottom=[(-25,-21),(20,-21),(31,-12),(31,12),(20,21),(-25,21)];top=[(-23,-17),(17,-17),(27,-10),(27,10),(17,17),(-23,17)];roof=42
        else:
            bottom=[(-24,-16),(-2,-21),(17,-17),(30,-7),(30,7),(17,17),(-2,21),(-24,16)];top=[(-20,-13),(-2,-15),(13,-12),(22,-6),(22,6),(13,12),(-2,15),(-20,13)];roof=35
        panel('sloped_composite_turret',bottom,27,top,roof,body)
        box('bustle_rear_rack',-29,0,30,9,28,7,BLACK)
        for y in (-15,15):box('bustle_rack_toprail',-28,y,35,14,1.3,1.3,STEEL)
        for x in (-34,-28,-22):box('bustle_rack_stanchion',x,0,35,1,29,1,STEEL)
        if faction=='chn':
            for side in (-1,1):
                for j in range(3):box('arrow_ERA_cheek',14-j*5,side*(11+j*2.4),31,8,5,4,light,(0,20,side*27))
    roof=38 if faction=='usa' else 42 if faction=='imp' else 35
    # Outer barrel only: thermal sleeve bands and an open muzzle are visible art details.
    box('gun_mantlet',24,0,30,12,10,9,body)
    barrel=Cylinder(1.15,60)-Cylinder(.7,62)
    add(Pos(56,0,31)*Rot(0,90,0)*barrel,'hollow_visual_barrel',STEEL)
    cyl('thermal_sleeve',40,0,31,1.65,21,body,(0,90,0))
    for x in (30,37,45,52,66):cyl('sleeve_band',x,0,31,1.8,.8,light,(0,90,0))
    cyl('bore_evacuator',57,0,31,2.1,7,body,(0,90,0))
    for x,y in ((-7,-8),(-10,8)):
        cyl('hatch_coaming',x,y,roof+1,5.2,1.2,BLACK)
        cyl('hatch_disc',x,y,roof+1.8,4.7,.9,body)
        box('hatch_handle',x,y,roof+2.5,3.5,.6,.6,STEEL)
        for a in (0,90,180,270):
            cyl('hatch_fastener',x+4*math.cos(math.radians(a)),y+4*math.sin(math.radians(a)),roof+2.3,.25,.3,light)
    for j in range(4):box('gunner_periscope',-2+j*2,-9,roof+1.9,1.4,2,1.6,GLASS)
    box('panoramic_optic_base',-13,10,roof+3,4,4,3,body)
    cyl('panoramic_optic',-13,10,roof+6,2.8,3,body)
    box('panoramic_window',-10.4,10,roof+6,1,3,1.7,GLASS)
    box('gunner_sight_housing',12,-8,roof+1,8,5,4,body)
    box('gunner_sight_glass',16,-8,roof+1,1,4,2.5,GLASS)
    cyl('weapon_station_pedestal',-4,8,roof+4,1.3,5,STEEL)
    box('remote_weapon_receiver',-1,8,roof+7,7,2,2,BLACK)
    cyl('remote_weapon_barrel',7,8,roof+7,.35,12,BLACK,(0,90,0))
    for side in (-1,1):
        for j in range(5):cyl('smoke_tube_external',3-j*3,side*17.5,roof-4,1,3,BLACK,(65,0,side*15))
        cyl('antenna_base',-20,side*11,roof+1,1.1,2,BLACK)
        cyl('whip_antenna',-20,side*11,roof+10,.16,18,STEEL)
        for x in (-40,38):box('tow_lug',x,side*13,17,3,3,3,STEEL)
    for y in (-15,15):
        box('headlamp_housing',34,y,22,3,4,3,BLACK)
        box('headlamp_lens',35.7,y,22,.3,3,2,(.62,.61,.41))
    # Visible camouflage blocks are surface plates < 0.2 model units thick, not added armour claims.
    for x,y in ((-35,-12),(-25,12),(-9,17),(1,-16),(11,10)):
        box('paint_patch',x,y,24.9,7,5,.12,body)
    return Compound(label={'usa':'M1A2_exterior_study','chn':'ZTZ99A_exterior_study','rus':'T90M_exterior_study','ind':'T90S_exterior_study','kor':'K2_exterior_study','imp':'Imperial_armour_concept'}[faction],children=parts)
