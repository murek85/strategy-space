# Builds the Colonies tank in Blender and exports it for the 3D renderer.
#   blender --background --python tools/blender/tank.py -- <out dir> [preview.png]
# Writes <out dir>/tank.blend (to edit by hand) and <out dir>/tank.glb (loaded by webgl3d/unit-showcase.js).
# Units are game units (the hull is ~44 long). Blender frame: +X the front, +Z up, -Y the right side
# (glTF turns it into the game's model frame: +X front, +Y up, +Z right).
# Named nodes the page animates: Hull, Turret, Gun (elevation pivot), Barrel (recoil), Muzzle, Antenna,
# Wheel_* (roll around their axle; custom property "radius"), Skirt_* (fall off with damage),
# Headlight_*, Exhaust_*, ERA, ERA_Turret, MG, Stowage, DeckBoxes (upgrades).
# Materials by name: Plate, Metal, Dark, Black, Rubber, Hub, Steel, Team, Glass, Lamp, Tail, Track, ERA, Crate.
import bpy, bmesh, math, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "assets/models")
PREVIEW = argv[1] if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


# ---------- materials ----------
def material(name, color, metal=0.35, rough=0.6, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get("Principled BSDF")
    rgb = tuple(int(color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    lin = tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb)
    b.inputs["Base Color"].default_value = (*lin, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        e = tuple(int(emit[i : i + 2], 16) / 255 for i in (1, 3, 5))
        b.inputs["Emission Color"].default_value = (*e, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


M = {
    "Plate": material("Plate", "#8a9e96"),
    "Metal": material("Metal", "#aab8ab"),
    "Dark": material("Dark", "#3f5654"),
    "Black": material("Black", "#1b2123", 0.4, 0.85),
    "Rubber": material("Rubber", "#141718", 0.0, 0.95),
    "Hub": material("Hub", "#c9d2c8", 0.8, 0.35),
    "Steel": material("Steel", "#2a3134", 0.8, 0.5),
    "Team": material("Team", "#3fd39a", 0.35, 0.5, "#3fd39a", 0.15),
    "Glass": material("Glass", "#8ff0e4", 0.35, 0.2, "#5fe0cf", 0.7),
    "Lamp": material("Lamp", "#fff6dd", 0.35, 0.6, "#fff1c4", 0.2),
    "Tail": material("Tail", "#ff4a3a", 0.35, 0.6, "#ff3020", 0.3),
    "Track": material("Track", "#2c3133", 0.3, 0.9),
    "ERA": material("ERA", "#7e8a74", 0.35, 0.7),
    "Crate": material("Crate", "#6e6248", 0.1, 0.9),
}


# ---------- helpers ----------
def link(ob, parent=None):
    col.objects.link(ob)
    if parent:
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
    return ob


def empty(name, loc, parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.location = loc
    ob.empty_display_size = 2
    link(ob, parent)
    bpy.context.view_layer.update()
    return ob


def mesh_object(name, bm, mat, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M[mat])
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    link(ob, parent)
    bpy.context.view_layer.update()
    return ob


def bevel(ob, width=0.5, segments=2, angle=35):
    m = ob.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = False
    return ob


def smooth(ob, angle=40):
    for p in ob.data.polygons:
        p.use_smooth = True
    try:
        ob.data.set_sharp_from_angle(angle=math.radians(angle))
    except Exception:
        pass
    return ob


def loft(rings):
    """A closed solid through rings of points (same count), capped at both ends."""
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rings[0])
    for a, b in zip(vs, vs[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(vs[0][::-1])
    bm.faces.new(vs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def prism(profile, width):
    """Side profile (x, z) extruded across the width (Y)."""
    return loft([[(x, width / 2, z) for x, z in profile], [(x, -width / 2, z) for x, z in profile]])


def box(name, size, loc, mat, parent=None, bev=0.3, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if rot:
        from mathutils import Euler

        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(rot).to_matrix())
    ob = mesh_object(name, bm, mat, parent, loc)
    if bev:
        bevel(ob, bev, 2, 30)
    return ob


def cylinder(name, r, depth, loc, mat, parent=None, axis="Y", segs=16, r2=None, bev=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    if axis == "Y":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.pi / 2, 3, "X"))
    elif axis == "X":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(-math.pi / 2, 3, "Y"))
    ob = mesh_object(name, bm, mat, parent, loc)
    smooth(ob)
    if bev:
        bevel(ob, bev, 2, 50)
    return ob


def join(name, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.convert(target="MESH")  # apply modifiers before joining
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    return ob


# ---------- tank ----------
root = empty("Tank", (0, 0, 0))
hull = empty("Hull", (0, 0, 0), root)

# Hull: sloped glacis, short rear slope, bevelled.
hb = mesh_object(
    "HullBody",
    prism([(-19, 4), (16, 4), (22, 8), (22, 9.5), (11, 15.5), (-17, 15.5), (-21, 12), (-21, 6)], 17),
    "Plate",
    hull,
)
bevel(hb, 0.7, 2, 25)
# Bolt rows along the hull sides (an array of one bolt).
for side in (-1, 1):
    bolt = cylinder("Bolts", 0.35, 0.5, (-16, side * 8.75, 13.8), "Steel", hull, axis="Y", segs=6)
    a = bolt.modifiers.new("Array", "ARRAY")
    a.count = 13
    a.relative_offset_displace = (0, 0, 0)
    a.use_constant_offset = True
    a.use_relative_offset = False
    a.constant_offset_displace = (2.4, 0, 0)

# Fenders, team stripes, engine deck with grilles, exhausts, driver hatch, lights, hooks, tools.
for side in (-1, 1):
    box("Fender", (42, 8.8, 1), (0, side * 11, 10.7), "Dark", hull, 0.25)
    box("Stripe", (18, 0.3, 1.2), (-6, side * 9.0, 13), "Team", hull, 0)
box("DeckStripe", (3, 17.5, 0.4), (-4, 0, 15.75), "Team", hull, 0)
box("Deck", (11, 13, 1.2), (-12, 0, 16.6), "Dark", hull, 0.3)
for i in range(5):
    box("Grille", (9.5, 0.7, 0.5), (-12, -4.8 + i * 2.4, 17.3), "Black", hull, 0)
for i, y in enumerate((-5.5, 5.5)):
    cylinder("Pipe", 1.0, 4, (-22, y, 12.5), "Steel", hull, axis="X", r2=1.1)
    cylinder("Muffler", 1.6, 5, (-20.5, y * 1.35, 12.5), "Dark", hull, axis="X", bev=0.2)
    empty("Exhaust_%d" % i, (-24.5, y, 12.5), hull)
cylinder("DriverHatch", 2.4, 0.8, (14.5, 4, 13.3), "Metal", hull, axis="Z", bev=0.15).rotation_euler = (0, math.radians(-29), 0)
box("Periscope", (1.2, 3, 1), (12.6, 4, 15.2), "Glass", hull, 0.15)
for i, y in enumerate((-7.5, 7.5)):
    cylinder("LampHousing", 1.2, 1.6, (20.6, -y, 11.6), "Steel", hull, axis="X", r2=1.0)
    cylinder("LampLens", 0.9, 0.2, (21.45, -y, 11.6), "Lamp", hull, axis="X")
    box("TailLight", (0.4, 1.8, 1), (-21.1, -y * 1.05, 13.4), "Tail", hull, 0)
    empty("Headlight_%d" % i, (21.5, -y, 11.6), hull)
for y in (-5, 5):
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.35, location=(22.2, y, 7.5), rotation=(math.pi / 2, 0, 0))
    t = bpy.context.active_object
    t.name = "Hook"
    t.data.materials.append(M["Steel"])
    t.parent = hull
# Shovel and crowbar on the left fender, a spare-link row on the glacis.
box("Shovel", (8, 1.2, 0.4), (4, 11.5, 11.4), "Crate", hull, 0.1)
box("Crowbar", (12, 0.5, 0.5), (-6, 13.3, 11.4), "Steel", hull, 0.1)
for i in range(4):
    box("SpareLink", (2.0, 3.6, 0.7), (17.8, -6 + i * 4, 12.1), "Track", hull, 0.15, rot=(0, math.radians(-28.6), 0))

# Running gear per side: belt, wheels, return rollers, skirts.
LINK = 2.2


def belt(side):
    half, r, cy, w = 18, 4.8, 5.1, 7
    pts = [(-half + 2 * half * i / 10, cy - r) for i in range(11)]
    pts += [(half + math.cos(a) * r, cy + math.sin(a) * r) for a in (-math.pi / 2 + math.pi * i / 16 for i in range(1, 17))]
    pts += [(half - 2 * half * i / 10, cy + r) for i in range(1, 11)]
    pts += [(-half + math.cos(a) * r, cy + math.sin(a) * r) for a in (math.pi / 2 + math.pi * i / 16 for i in range(1, 16))]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    rows = [[bm.verts.new((x, y, z)) for x, z in pts] for y in (w / 2, -w / 2)]
    s = [0.0]
    for i in range(1, len(pts) + 1):
        a, b = pts[i - 1], pts[i % len(pts)]
        s.append(s[-1] + math.dist(a, b))
    n = len(pts)
    for i in range(n):
        f = bm.faces.new((rows[0][i], rows[0][(i + 1) % n], rows[1][(i + 1) % n], rows[1][i]))
        u0, u1 = s[i] / LINK, s[i + 1] / LINK
        for loop, (u, v) in zip(f.loops, ((u0, 0), (u1, 0), (u1, 1), (u0, 1))):
            loop[uv].uv = (u, v)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:  # outward
        if (f.calc_center_median() - Vector((0, 0, cy))).dot(f.normal) < 0:
            f.normal_flip()
    ob = mesh_object("Track_%s" % ("R" if side < 0 else "L"), bm, "Track", hull, (0, side * 11, 0))
    so = ob.modifiers.new("Thickness", "SOLIDIFY")
    so.thickness = 0.9
    so.offset = -1
    return ob


def wheel(name, r, sprocket=False):
    parts = [cylinder(name, r, 6.2, (0, 0, 0), "Dark" if sprocket else "Rubber", None, axis="Y", segs=10 if sprocket else 20, bev=0.4)]
    parts.append(cylinder("hub", r * 0.58, 6.6, (0, 0, 0), "Hub", None, axis="Y", segs=12, bev=0.2))
    parts.append(cylinder("cap", r * 0.22, 7.2, (0, 0, 0), "Steel", None, axis="Y", segs=8))
    for i in range(6):
        a = i * math.pi / 3
        parts.append(cylinder("nut", 0.28, 7.0, (math.cos(a) * r * 0.4, 0, math.sin(a) * r * 0.4), "Steel", None, axis="Y", segs=6))
    if sprocket:
        for i in range(10):
            a = i * math.pi / 5
            parts.append(box("tooth", (1.2, 5, 1.2), (math.cos(a) * r, 0, math.sin(a) * r), "Steel", None, 0.1, rot=(0, -a, 0)))
    return join(name, parts)


road = wheel("WheelMesh", 3.2)
sprocket = wheel("SprocketMesh", 3.7, True)
idler = wheel("IdlerMesh", 3.4)
templates = [road, sprocket, idler]
k = 0
for side in (-1, 1):
    belt(side)
    places = [(-13 + i * 6.5, 3.7, road, 3.2) for i in range(5)] + [(18, 5.4, sprocket, 3.7), (-18, 5.4, idler, 3.4)]
    for x, z, t, r in places:
        w = bpy.data.objects.new("Wheel_%d" % k, t.data)  # shared mesh
        w.location = (x, side * 11, z)
        w["radius"] = r
        link(w, hull)
        k += 1
    for x in (-7, 7):
        cylinder("Roller", 1.1, 3, (x, side * 11, 9.2), "Black", hull, axis="Y")
    for i in range(4):
        sk = box("Skirt_%d" % (i + (0 if side < 0 else 4)), (9.4, 0.9, 5), (-14.4 + i * 9.6, side * 15, 8.2), "Plate", hull, 0.3)
        # Hangers.
        box("Hanger", (0.8, 1.5, 1.6), (-14.4 + i * 9.6, side * 14.2, 10.2), "Dark", hull, 0)
for t in templates:
    col.objects.unlink(t)

# Turret: tapering six-sided cast shape, bevelled.
turret = empty("Turret", (1, 0, 15.5), hull)
plan = [(12, 0), (7, 7.5), (-8, 8), (-12, 4.5), (-12, -4.5), (-8, -8), (7, -7.5)]
tb = mesh_object(
    "TurretBody",
    loft([[(x, y, 0) for x, y in plan], [(x * 1.02, y * 1.02, 3.5) for x, y in plan], [(x * 0.84 - 1, y * 0.84, 7.4) for x, y in plan]]),
    "Metal",
    turret,
    (1, 0, 15.5),
)
bevel(tb, 0.9, 3, 20)
box("TurretStripe", (3, 16.2, 0.4), (-5, 0, 23.0), "Team", turret, 0)
for side in (-1, 1):
    box("TurretSide", (8, 0.3, 1.6), (-2, side * 8.4, 19.6), "Team", turret, 0)
box("Sight", (2.4, 4.4, 1.6), (8, 4, 22.6), "Glass", turret, 0.3)
cylinder("Cupola", 3.0, 2.2, (-3, -3.6, 24.0), "Dark", turret, axis="Z", r2=2.7, bev=0.3)
cylinder("Hatch", 2.6, 0.6, (-3, -3.6, 25.4), "Metal", turret, axis="Z", bev=0.2)
for i in range(6):
    a = i * 1.05 + 0.5
    box("Vision", (0.6, 0.6, 0.6), (-3 + math.cos(a) * 3.0, -3.6 + math.sin(a) * 3.0, 24.2), "Glass", turret, 0)
for i in range(3):
    box("Smoke", (1.0, 1.0, 1.0), (4 - i * 1.4, 7.6, 18.9), "Dark", turret, 0.1, rot=(math.radians(-50), 0, 0))
    box("Smoke", (1.0, 1.0, 1.0), (4 - i * 1.4, -7.6, 18.9), "Dark", turret, 0.1, rot=(math.radians(50), 0, 0))
antenna = empty("Antenna", (-8, 5, 23.1), turret)
cylinder("AntennaBase", 0.7, 1.2, (-8, 5, 23.7), "Steel", antenna, axis="Z")
cylinder("AntennaWhip", 0.12, 22, (-8, 5, 34.3), "Black", antenna, axis="Z", r2=0.06, segs=5)

# Gun: mantlet on the elevation pivot, recoiling barrel with fume extractor and slotted muzzle brake.
gun = empty("Gun", (12, 0, 19.7), turret)
mantlet = mesh_object("Mantlet", loft([[(-2, y, z) for y, z in ((-4, -2.6), (4, -2.6), (4, 2.6), (-4, 2.6))], [(2.6, y * 0.85, z * 0.8) for y, z in ((-4, -2.6), (4, -2.6), (4, 2.6), (-4, 2.6))]]), "Dark", gun, (12.5, 0, 19.7))
bevel(mantlet, 0.7, 3, 20)
barrel = empty("Barrel", (12, 0, 19.7), gun)
cylinder("Tube", 1.35, 26, (27, 0, 19.7), "Dark", barrel, axis="X", r2=1.12, segs=18)
cylinder("Extractor", 1.9, 4.2, (28, 0, 19.7), "Dark", barrel, axis="X", segs=18, bev=0.5)
cylinder("Collar", 1.55, 1.2, (13.6, 0, 19.7), "Steel", barrel, axis="X", segs=18)
brake = box("Brake", (4.2, 3.6, 2.6), (41.5, 0, 19.7), "Black", barrel, 0.5)
for x in (40.6, 42.4):
    box("BrakeSlot", (0.7, 3.8, 1.6), (x, 0, 19.7), "Steel", barrel, 0)
empty("Muzzle", (44, 0, 19.7), barrel)

# Upgrades: reactive armour (glacis, turret cheeks), roof machine gun, stowage.
era = empty("ERA", (0, 0, 0), hull)
for row in range(2):
    x = 19.5 - row * 4.2
    z = 9.5 + (22 - x) / 11 * 6
    for i in range(5):
        box("Brick", (3.8, 3, 1.2), (x + 0.5, -6.4 + i * 3.2, z + 0.9), "ERA", era, 0.25, rot=(0, math.radians(28.6), 0))
era_t = empty("ERA_Turret", (1, 0, 15.5), turret)
for side in (-1, 1):
    for i in range(3):
        box("Brick", (3.2, 1.2, 3), (7 - i * 3.4, side * 8.6, 19.1), "ERA", era_t, 0.25)
mg = empty("MG", (-3, -3.6, 25.7), turret)
box("MGPost", (1.2, 1.2, 2.4), (-3, -3.6, 26.9), "Steel", mg, 0.1)
box("MGBody", (4, 1.4, 1.4), (-1.6, -3.6, 28.3), "Black", mg, 0.15)
cylinder("MGBarrel", 0.3, 7, (2.5, -3.6, 28.3), "Black", mg, axis="X", segs=8)
box("MGBox", (1.4, 1.4, 1.6), (-1.4, -2.4, 27.6), "Dark", mg, 0.1)
stow = empty("Stowage", (1, 0, 15.5), turret)
box("Bustle", (7, 4, 3.4), (-13.6, 0, 19.1), "Crate", stow, 0.4)
for i in range(3):
    box("Strap", (0.4, 4.2, 3.6), (-15.6 + i * 2, 0, 19.1), "Black", stow, 0)
deck = empty("DeckBoxes", (0, 0, 0), hull)
for side in (-1, 1):
    box("FenderBox", (8, 2.6, 2.4), (-12, side * 12.5, 12.4), "Crate", deck, 0.4)
    cylinder("Drum", 1.8, 4.5, (-16, side * 12.8, 13.2), "Dark", deck, axis="Z", bev=0.2)

bpy.context.view_layer.update()

# ---------- save and export ----------
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "tank.blend"))
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "tank.glb"),
    export_format="GLB",
    export_apply=True,
    export_extras=True,
    export_yup=True,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print("EXPORTED", os.path.join(OUT, "tank.glb"))

# ---------- preview render ----------
if PREVIEW:
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 60
    cam = bpy.data.objects.new("Camera", cam_data)
    col.objects.link(cam)
    cam.location = (88, -104, 64)
    direction = Vector((2, 0, 12)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 4
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    col.objects.link(sun)
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.data.materials.append(material("Ground", "#b49a6c", 0, 1))
    world = bpy.data.worlds.new("World")
    scene.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.6, 0.68, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH"):
        try:
            scene.render.engine = engine
            break
        except Exception:
            continue
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    scene.render.filepath = os.path.abspath(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scene.render.filepath, scene.render.engine)
