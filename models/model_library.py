"""Parametric, original game-art assemblies. Millimetres; X forward, Z up.
Not manufacturing geometry or a dimensional replica of a named weapon."""
from build123d import Box, Cylinder, Sphere, Cone, Polygon, Ellipse, extrude, loft, Pos, Rot, Color, Compound
from detailed_tanks import make_tank

ARMOR=(.34,.42,.36); EDGE=(.53,.59,.49); DARK=(.14,.20,.21); METAL=(.62,.67,.62); GOLD=(.76,.64,.38); GLASS=(.16,.32,.40); SOLAR=(.16,.29,.43)

def make_model(kind):
    if kind.startswith('tank'):
        return make_tank(kind.split('_',1)[1] if '_' in kind else 'chn')
    parts=[]
    def add(s,label,color=ARMOR):
        s.label=label;s.color=Color(*color);parts.append(s);return s
    def box(name,x,y,z,l,w,h,color=ARMOR):return add(Pos(x,y,z)*Box(l,w,h),name,color)
    def cyl(name,x,y,z,r,h,color=ARMOR,rx=0,ry=0):return add(Pos(x,y,z)*Rot(rx,ry,0)*Cylinder(r,h),name,color)
    def poly(name,pts,z,h,color=ARMOR):return add(Pos(0,0,z)*extrude(Polygon(*pts,align=None),amount=h),name,color)
    def taper(name,bottom,z0,top,z1,color=ARMOR):return add(loft([Pos(0,0,z0)*Polygon(*bottom,align=None),Pos(0,0,z1)*Polygon(*top,align=None)]),name,color)
    if kind=='tank':
        poly('sloped_hull',[(-43,-20),(34,-20),(49,-12),(49,12),(34,20),(-43,20)],10,14)
        box('engine_deck',-30,0,25,24,36,3,EDGE)
        for y in (-25,25):
            box('track_core',0,y,10,94,9,18,DARK)
            for i in range(7):cyl('road_wheel',-36+i*12,y,10,7.2,10,METAL,rx=90)
            for i in range(18):
                box('track_link_top',-43+i*5,y,20,4,11,2,EDGE)
                box('track_link_ground',-43+i*5,y,0,4,11,2,DARK)
        cyl('turret_ring',0,0,26,18,4,DARK)
        poly('faceted_turret',[(-19,-15),(13,-17),(26,-8),(26,8),(13,17),(-19,15)],28,11,EDGE)
        box('mantlet',25,0,33,12,11,9)
        cyl('gun_visual',51,0,34,1.6,53,METAL,ry=90)
        cyl('gun_sleeve',35,0,34,2.5,18,ARMOR,ry=90)
        cyl('muzzle',78,0,34,2.3,4,DARK,ry=90)
        for y in (-8,8):cyl('roof_hatch',-4,y,41,5.4,2.5,ARMOR)
        for i in range(5):box('engine_louvre',-31+i*4,0,27,1,27,1,DARK)
        box('optic_window',16,-9,41,7,6,5,GLASS)
        box('commander_sensor',-13,10,44,5,5,5,GLASS)
        cyl('antenna',-17,-12,53,.4,29,DARK)
        for y in (-19,19):
            for x in (-7,3,13):box('armor_module',x,y,32,8,4,8,ARMOR)
    elif kind=='destroyer':
        # Slender modern 055-inspired silhouette; external study, not measured replica.
        hull=[(-104,-8),(48,-11),(80,-8),(108,0),(80,8),(48,11),(-104,8)]
        taper('flared_hull',[(x,y*.78)for x,y in hull],0,hull,9,DARK)
        poly('main_deck',hull,9,1.5,METAL)
        taper('aft_hangar',[(-76,-9),(-46,-9),(-46,9),(-76,9)],10,[(-74,-7),(-48,-7),(-48,7),(-74,7)],23,ARMOR)
        box('hangar_port_door',-76.3,-4,16,1,6,9,DARK);box('hangar_starboard_door',-76.3,4,16,1,6,9,DARK)
        taper('stealth_bridge',[(-8,-10),(27,-10),(35,-6),(35,6),(27,10),(-8,10)],10,[(-5,-7),(22,-7),(28,-4),(28,4),(22,7),(-5,7)],29,EDGE)
        box('bridge_glass',28,0,27,1,9,2,GLASS)
        for y in (-7.5,7.5):box('bridge_side_windows',16,y,27,12,1,2,GLASS)
        taper('integrated_mast',[(-1,-6),(14,-6),(14,6),(-1,6)],29,[(2,-3),(11,-3),(11,3),(2,3)],48,ARMOR)
        for y in (-5,5):box('phased_array_face',7,y,36,10,1,7,GLASS)
        for x in (1,13):box('phased_array_face',x,0,36,1,8,7,GLASS)
        cyl('mast_sensor',6,0,51,2,6,METAL)
        for x in range(40,64,3):
            for y in (-8,-5,-2,1,4,7):box('fore_VLS_cover',x,y,11.1,2.4,2.4,.45,DARK)
        for x in range(-40,-22,3):
            for y in (-8,-5,-2,1,4,7):box('aft_VLS_cover',x,y,11.1,2.4,2.4,.45,DARK)
        cyl('bow_gun_base',82,0,13,4.3,5,ARMOR)
        taper('faceted_gun_shield',[(76,-4),(85,-4),(88,0),(85,4),(76,4)],14,[(78,-3),(84,-3),(86,0),(84,3),(78,3)],20,EDGE)
        cyl('bow_barrel',93,0,18,.6,17,METAL,ry=90)
        for x in (-17,-9):box('exhaust_stack',x,0,24,5,8,13,ARMOR);box('exhaust_cap',x,0,31,5,8,1,DARK)
        for y in (-9.5,9.5):box('RHIB_recess',-48,y,15,14,1,4,DARK);box('RHIB_boat',-48,y,16,11,2.5,2,EDGE)
        for y in (-7,7):box('flightdeck_edge',-89,y,11,29,.3,.2,GOLD)
        box('flightdeck_centerline',-89,0,11,25,.3,.2,GOLD)
        for x in range(-99,81,9):
            for y in (-10,10):box('railing_stanchion',x,y,12,.3,.3,3,METAL)
        for y in (-10,10):box('railing_topline',-10,y,13.5,180,.2,.2,METAL)
        for x in (-80,-45,-6,30,66):box('deck_access_hatch',x,-7,11,3,2,.4,ARMOR)
        for x in (-43,34):cyl('close_in_weapon_base',x,0,24,2.7,4,ARMOR)
    elif kind=='fighter':
        poly('cranked_delta_wing',[(-61,-9),(-29,-17),(-35,-48),(13,-29),(65,0),(13,29),(-35,48),(-29,17),(-61,9)],0,3,METAL)
        poly('faceted_fuselage',[(-56,-8),(-15,-11),(25,-7),(65,0),(25,7),(-15,11),(-56,8)],3,7,EDGE)
        poly('dorsal_spine',[(-43,-5),(9,-4),(38,0),(9,4),(-43,5)],10,3,ARMOR)
        add(loft([Pos(17,0,10)*Ellipse(12,4.5),Pos(17,0,14)*Ellipse(8,3),Pos(17,0,16)*Ellipse(2,.8)]),'canopy',GLASS)
        for y in (-12,12):
            box('inlet_lip',-5,y,5,18,5,3,ARMOR)
            box('inlet_shadow',-3,y,7,13,3,1,DARK)
            box('exhaust',-53,y/2,7,10,7,5,DARK)
            box('internal_bay_door',-8,y,0,30,8,1,EDGE)
        for x,y in ((39,0),(3,-20),(3,20),(-35,-26),(-35,26)):
            box('sensor_window',x,y,4,3,3,.8,GLASS)
        for y in (-25,25):box('wing_service_panel',-14,y,4,14,7,.5,ARMOR)
    elif kind=='satellite':
        box('service_bus',0,0,10,23,21,20,GOLD)
        box('payload_bay',10,0,15,12,16,12,METAL)
        for side in (-1,1):
            box('solar_hinge',0,side*17,10,4,13,4,METAL)
            for k in range(3):
                yy=side*(29+k*17);box('solar_panel',0,yy,10,34,15,1,SOLAR)
                for x in (-12,-4,4,12):box('solar_cell_seam',x,yy,10.7,.4,15,.2,METAL)
        cyl('payload_aperture',17,0,15,5,5,GLASS,ry=90)
        cyl('antenna_stem',-5,0,27,1,12,METAL)
        add(Pos(-5,0,33)*Cone(8,1,5),'antenna_concept_dish',METAL)
        for y in (-7,7):cyl('thruster_nozzle',-15,y,6,2.5,5,DARK,ry=90)
        box('radiator',0,0,21,20,17,1,DARK)
    elif kind=='orbital':
        poly('armored_keel',[(-102,-14),(44,-20),(108,0),(44,20),(-102,14)],0,18,METAL)
        box('superstructure',-18,0,24,100,24,15,ARMOR)
        box('command_spire',-19,0,39,22,16,23,EDGE)
        box('sensor_bridge',-12,0,51,20,23,4,GLASS)
        for side in (-1,1):
            box('radiator_frame',-25,side*35,7,100,25,2,DARK)
            for i in range(10):box('radiator_fin',-70+i*10,side*35,9,6,24,3,SOLAR)
            for i in range(5):
                x=-52+i*21;box('lance_battery',x,side*22,20,13,7,8,ARMOR)
                cyl('emitter',x+7,side*22,22,2,11,GOLD,ry=90)
        for y in (-10,0,10):cyl('engine_nozzle',-106,y,11,5,13,DARK,ry=90)
        box('prow_lance',70,0,23,45,7,7,GOLD)
        for x in range(-80,61,20):box('dorsal_plating',x,0,34,12,27,2,EDGE)
    elif kind=='defense':
        box('foundation',0,0,2,60,60,4,DARK)
        cyl('armored_base',0,0,9,22,14,ARMOR)
        cyl('azimuth_ring',0,0,18,18,4,METAL)
        box('turret',0,0,26,28,23,14,EDGE)
        cyl('laser_emitter',21,0,29,4,24,METAL,ry=90)
        cyl('optical_front',34,0,29,3.5,1,GLASS,ry=90)
        for y in (-15,15):
            box('power_module',-10,y,26,19,5,10,DARK)
            for x in (-16,-11,-6):box('cooling_fin',x,y,33,2,7,4,METAL)
        box('tracking_optic',3,-8,37,10,7,6,GLASS)
        cyl('radar_mast',-11,5,40,1,16,METAL)
        box('radar_array',-11,5,49,17,3,8,GLASS)
        for x in (-24,24):
            for y in (-24,24):cyl('foundation_bolt',x,y,5,2,2,METAL)
    else:raise ValueError(kind)
    return Compound(label='ModernFront_'+kind,children=parts)
