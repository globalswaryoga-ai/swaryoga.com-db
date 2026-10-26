import bpy
import bmesh
import math
import os
import sys
import subprocess
import time

def build_complete_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # 1. Output & Render Config
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.fps = 25
    scene.frame_start = 1
    scene.frame_end = 750

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = False

    # 2. World Lighting (Warm Serene Vedic Studio)
    world = bpy.data.worlds.new(name="WarmVedicStudio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.04, 0.05, 0.07, 1.0)
        bg.inputs[1].default_value = 1.0

    # 3. 3-Point Cinematic Lighting
    # Key light (Warm morning sunbeam)
    key = bpy.data.lights.new("KeySun", "SUN")
    key.energy = 5.5
    key.color = (1.0, 0.94, 0.86)
    key_obj = bpy.data.objects.new("KeySun", key)
    key_obj.location = (3.5, -4.0, 4.5)
    key_obj.rotation_euler = (math.radians(55), math.radians(15), math.radians(-30))
    bpy.context.collection.objects.link(key_obj)

    # Fill light (Cool sky bounce)
    fill = bpy.data.lights.new("FillSky", "AREA")
    fill.energy = 420
    fill.size = 3.5
    fill.color = (0.7, 0.85, 1.0)
    fill_obj = bpy.data.objects.new("FillSky", fill)
    fill_obj.location = (-3.0, -3.0, 3.0)
    fill_obj.rotation_euler = (math.radians(50), math.radians(-25), math.radians(35))
    bpy.context.collection.objects.link(fill_obj)

    # Rim / Back light
    rim = bpy.data.lights.new("RimBack", "POINT")
    rim.energy = 850
    rim.color = (0.8, 0.9, 1.0)
    rim_obj = bpy.data.objects.new("RimBack", rim)
    rim_obj.location = (0.0, 3.0, 3.0)
    bpy.context.collection.objects.link(rim_obj)

    # 4. Materials
    # Floor Stone
    floor_mat = bpy.data.materials.new("AshramStone")
    floor_mat.use_nodes = True
    f_bsdf = floor_mat.node_tree.nodes["Principled BSDF"]
    f_bsdf.inputs["Base Color"].default_value = (0.10, 0.11, 0.13, 1.0)
    f_bsdf.inputs["Roughness"].default_value = 0.55

    # Teak Table Material
    teak_mat = bpy.data.materials.new("TeakWood")
    teak_mat.use_nodes = True
    t_bsdf = teak_mat.node_tree.nodes["Principled BSDF"]
    t_bsdf.inputs["Base Color"].default_value = (0.32, 0.16, 0.07, 1.0)
    t_bsdf.inputs["Roughness"].default_value = 0.28

    # Authentic Ayurvedic Copper Material
    copper_mat = bpy.data.materials.new("AyurvedicCopper")
    copper_mat.use_nodes = True
    c_bsdf = copper_mat.node_tree.nodes["Principled BSDF"]
    c_bsdf.inputs["Base Color"].default_value = (0.85, 0.44, 0.22, 1.0)
    c_bsdf.inputs["Metallic"].default_value = 1.0
    c_bsdf.inputs["Roughness"].default_value = 0.18

    # Faceted Crystal Glass Material (IOR = 1.52)
    glass_mat = bpy.data.materials.new("FacetedCrystal")
    glass_mat.use_nodes = True
    g_bsdf = glass_mat.node_tree.nodes["Principled BSDF"]
    g_bsdf.inputs["Base Color"].default_value = (0.95, 0.98, 1.0, 1.0)
    g_bsdf.inputs["Roughness"].default_value = 0.02
    if "Transmission Weight" in g_bsdf.inputs:
        g_bsdf.inputs["Transmission Weight"].default_value = 1.0
    elif "Transmission" in g_bsdf.inputs:
        g_bsdf.inputs["Transmission"].default_value = 1.0
    g_bsdf.inputs["IOR"].default_value = 1.520

    # Crystal Clear Water Material (IOR = 1.333)
    water_mat = bpy.data.materials.new("PureWater")
    water_mat.use_nodes = True
    w_bsdf = water_mat.node_tree.nodes["Principled BSDF"]
    w_bsdf.inputs["Base Color"].default_value = (0.85, 0.94, 1.0, 1.0)
    w_bsdf.inputs["Roughness"].default_value = 0.005
    if "Transmission Weight" in w_bsdf.inputs:
        w_bsdf.inputs["Transmission Weight"].default_value = 1.0
    elif "Transmission" in w_bsdf.inputs:
        w_bsdf.inputs["Transmission"].default_value = 1.0
    w_bsdf.inputs["IOR"].default_value = 1.333

    # 5. Environment Geometry
    # Floor
    bpy.ops.mesh.primitive_plane_add(size=16.0, location=(0, 0, 0))
    floor_obj = bpy.context.active_object
    floor_obj.name = "Floor"
    floor_obj.data.materials.append(floor_mat)

    # Teak Table Top (1.3m x 0.75m x 0.05m at Z = 0.72m)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.72))
    table_top = bpy.context.active_object
    table_top.name = "TableTop"
    table_top.scale = (1.3, 0.75, 0.05)
    table_top.data.materials.append(teak_mat)

    # 4 Table Legs
    for lx, ly in [(-0.58, -0.30), (0.58, -0.30), (-0.58, 0.30), (0.58, 0.30)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.70, vertices=16, location=(lx, ly, 0.35))
        leg = bpy.context.active_object
        leg.data.materials.append(teak_mat)

    # Wooden Chair for Character
    seat_z = 0.45
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.65, seat_z))
    seat = bpy.context.active_object
    seat.name = "ChairSeat"
    seat.scale = (0.55, 0.52, 0.04)
    seat.data.materials.append(teak_mat)

    for cx, cy in [(-0.24, 0.42), (0.24, 0.42), (-0.24, 0.88), (0.24, 0.88)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=seat_z, vertices=16, location=(cx, cy, seat_z/2.0))
        cleg = bpy.context.active_object
        cleg.data.materials.append(teak_mat)

    # Chair Backrest
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.90, seat_z + 0.35))
    backrest = bpy.context.active_object
    backrest.scale = (0.52, 0.04, 0.55)
    backrest.data.materials.append(teak_mat)

    # 6. Authentic Copper Jug with Neck, Bulbous Belly, Rim, Spout & Handle
    jug_mesh = bpy.data.meshes.new("CopperJugMesh")
    jug_obj = bpy.data.objects.new("CopperJug", jug_mesh)
    bpy.context.collection.objects.link(jug_obj)
    jug_obj.location = (0.25, -0.08, 0.75)

    bm = bmesh.new()
    profile = [
        (0.00, 0.00),
        (0.08, 0.00), # Base
        (0.12, 0.07), # Lower Bulb
        (0.14, 0.15), # Belly
        (0.10, 0.23), # Shoulder
        (0.065, 0.28), # Neck
        (0.09, 0.34), # Flared Lip
        (0.08, 0.34), # Inner Lip
        (0.055, 0.27), # Inner Neck
        (0.09, 0.22), # Inner Shoulder
        (0.12, 0.14), # Inner Belly
        (0.00, 0.02), # Inner Base
    ]
    rings = []
    for r, z in profile:
        ring = []
        for i in range(24):
            ang = 2.0 * math.pi * i / 24
            r_mod = r
            if z > 0.32 and abs(ang - math.pi) < 0.6:
                r_mod *= 1.25 # Pouring spout
            vx = r_mod * math.cos(ang)
            vy = r_mod * math.sin(ang)
            ring.append(bm.verts.new((vx, vy, z)))
        rings.append(ring)

    for i in range(len(rings) - 1):
        r1, r2 = rings[i], rings[i+1]
        for j in range(24):
            jn = (j + 1) % 24
            bm.faces.new([r1[j], r1[jn], r2[jn], r2[j]])

    bm.to_mesh(jug_mesh)
    bm.free()
    for p in jug_mesh.polygons:
        p.use_smooth = True

    # Handle for Jug
    bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.015, major_segments=24, minor_segments=12, location=(0.25, 0.08, 0.93))
    handle = bpy.context.active_object
    handle.name = "JugHandle"
    handle.rotation_euler = (math.radians(90), 0, math.radians(90))
    handle.scale = (0.5, 1.1, 0.7)

    # Parent handle to jug so it moves together
    handle.parent = jug_obj
    handle.matrix_parent_inverse = jug_obj.matrix_world.inverted()

    jug_obj.data.materials.append(copper_mat)
    handle.data.materials.append(copper_mat)

    # 7. Faceted Crystal Glass Tumbler (8 facets, heavy solid base)
    glass_mesh = bpy.data.meshes.new("CrystalGlassMesh")
    glass_obj = bpy.data.objects.new("CrystalGlass", glass_mesh)
    bpy.context.collection.objects.link(glass_obj)
    glass_obj.location = (-0.06, -0.12, 0.75)

    bm_g = bmesh.new()
    g_profile = [
        (0.00, 0.00), # Base center
        (0.065, 0.00), # Outer base
        (0.072, 0.04), # Heavy solid bottom
        (0.088, 0.18), # Top rim outer
        (0.078, 0.18), # Top rim inner
        (0.064, 0.04), # Inner bottom
        (0.00, 0.04), # Inner bottom center
    ]
    g_rings = []
    for r, z in g_profile:
        ring = []
        for i in range(8):
            ang = 2.0 * math.pi * i / 8
            vx = r * math.cos(ang)
            vy = r * math.sin(ang)
            ring.append(bm_g.verts.new((vx, vy, z)))
        g_rings.append(ring)

    for i in range(len(g_rings) - 1):
        r1, r2 = g_rings[i], g_rings[i+1]
        for j in range(8):
            jn = (j + 1) % 8
            bm_g.faces.new([r1[j], r1[jn], r2[jn], r2[j]])

    bm_g.to_mesh(glass_mesh)
    bm_g.free()
    glass_obj.data.materials.append(glass_mat)

    # 8. Crystal Clear Water Inside Glass
    water_mesh = bpy.data.meshes.new("WaterMesh")
    water_obj = bpy.data.objects.new("CrystalWater", water_mesh)
    bpy.context.collection.objects.link(water_obj)
    water_obj.location = (-0.06, -0.12, 0.79)

    bm_w = bmesh.new()
    w_bot = [bm_w.verts.new((0.062 * math.cos(2*math.pi*i/8), 0.062 * math.sin(2*math.pi*i/8), 0.00)) for i in range(8)]
    w_top = [bm_w.verts.new((0.074 * math.cos(2*math.pi*i/8), 0.074 * math.sin(2*math.pi*i/8), 0.12)) for i in range(8)]
    for j in range(8):
        jn = (j + 1) % 8
        bm_w.faces.new([w_bot[j], w_bot[jn], w_top[jn], w_top[j]])
    bm_w.faces.new(w_bot)
    bm_w.faces.new(w_top)
    bm_w.to_mesh(water_mesh)
    bm_w.free()
    water_obj.data.materials.append(water_mat)

    # 9. Dynamic Pouring Water Stream (Visible 10s-15s, frames 250-360)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.35, vertices=16, location=(0.08, -0.10, 0.92))
    stream_obj = bpy.context.active_object
    stream_obj.name = "WaterStream"
    stream_obj.data.materials.append(water_mat)
    stream_obj.rotation_euler = (math.radians(-10), math.radians(-32), 0)

    # 10. Load Character & Wire All 7 Textures
    avatar_dir = "/var/www/swaryoga/public/models/avatar/male"
    avatar_path = os.path.join(avatar_dir, "Male_Adult_01.fbx")
    print(f"Loading rigged character from {avatar_path}...")
    bpy.ops.import_scene.fbx(filepath=avatar_path)
    arm = None
    char_meshes = []
    for obj in bpy.context.selected_objects:
        if obj.type == "ARMATURE":
            arm = obj
        elif obj.type == "MESH":
            char_meshes.append(obj)

    body_tex_path = os.path.join(avatar_dir, "m002_body_color.tga")
    head_tex_path = os.path.join(avatar_dir, "m002_head_color.tga")

    for m_obj in char_meshes:
        for mat in m_obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            nodes = mat.node_tree.nodes
            bsdf_n = nodes.get("Principled BSDF")
            if not bsdf_n:
                continue
            tex_path = head_tex_path if "head" in mat.name.lower() else body_tex_path
            if os.path.exists(tex_path):
                img = bpy.data.images.load(tex_path, check_existing=True)
                tex_node = nodes.new(type="ShaderNodeTexImage")
                tex_node.image = img
                mat.node_tree.links.new(tex_node.outputs["Color"], bsdf_n.inputs["Base Color"])
                bsdf_n.inputs["Roughness"].default_value = 0.45

    # 11. Rigged Character Pose & Complete Continuous Animation Across 750 Frames
    if arm:
        arm.name = "CharacterRig"
        arm.location = (0, 0.65, 0.28)
        arm.rotation_euler = (0, 0, math.radians(180))
        arm.scale = (0.01, 0.01, 0.01)

        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="POSE")

        def rot_b(name, rx, ry, rz):
            b = arm.pose.bones.get(name)
            if b:
                b.rotation_mode = "XYZ"
                b.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
                return b
            return None

        def key_b(name, frame):
            b = arm.pose.bones.get(name)
            if b:
                b.keyframe_insert(data_path="rotation_euler", frame=frame)

        # Baseline Seated Posture
        rot_b("Bip01 L Thigh", 90, 0, 0)
        rot_b("Bip01 R Thigh", 90, 0, 0)
        rot_b("Bip01 L Calf", -90, 0, 0)
        rot_b("Bip01 R Calf", -90, 0, 0)
        rot_b("Bip01 L Foot", 0, 0, 0)
        rot_b("Bip01 R Foot", 0, 0, 0)

        rot_b("Bip01 Spine", 0, 0, 0)
        rot_b("Bip01 Spine1", 0, 0, 0)
        rot_b("Bip01 Spine2", 0, 0, 0)
        rot_b("Bip01 Neck", 0, 0, 0)
        rot_b("Bip01 Head", 0, 0, 0)

        # Left Arm resting naturally flat on tabletop throughout
        rot_b("Bip01 L UpperArm", 62, 0, 22)
        rot_b("Bip01 L Forearm", -72, -20, 0)
        rot_b("Bip01 L Hand", 0, 0, 15)

        # Right Arm & Hand Keyframes:
        # Frame 1-125 (0s-5s): Right arm resting beside jug
        rot_b("Bip01 R UpperArm", 62, 0, -12)
        rot_b("Bip01 R Forearm", -68, 18, 0)
        rot_b("Bip01 R Hand", 0, 0, -15)
        key_b("Bip01 R UpperArm", 1)
        key_b("Bip01 R Forearm", 1)
        key_b("Bip01 R Hand", 1)
        key_b("Bip01 Head", 1)

        key_b("Bip01 R UpperArm", 125)
        key_b("Bip01 R Forearm", 125)
        key_b("Bip01 R Hand", 125)
        key_b("Bip01 Head", 125)

        # Frame 250 (10s): Right hand grips jug handle & tilts to pour
        rot_b("Bip01 R UpperArm", 48, 5, -8)
        rot_b("Bip01 R Forearm", -55, 24, 0)
        rot_b("Bip01 R Hand", -15, -35, -20)
        key_b("Bip01 R UpperArm", 250)
        key_b("Bip01 R Forearm", 250)
        key_b("Bip01 R Hand", 250)

        # Frame 360 (14.4s): Jug back upright
        rot_b("Bip01 R Hand", 0, -10, -15)
        key_b("Bip01 R Hand", 360)

        # Frame 375 (15s): Jug returned, hand releases handle
        rot_b("Bip01 R UpperArm", 58, 0, -12)
        rot_b("Bip01 R Forearm", -65, 18, 0)
        rot_b("Bip01 R Hand", 0, 0, -10)
        key_b("Bip01 R UpperArm", 375)
        key_b("Bip01 R Forearm", 375)
        key_b("Bip01 R Hand", 375)

        # Frame 425 (17s): Hand moves to grip crystal glass
        rot_b("Bip01 R UpperArm", 50, -5, -4)
        rot_b("Bip01 R Forearm", -60, 15, 0)
        rot_b("Bip01 R Hand", 10, -15, 5)
        key_b("Bip01 R UpperArm", 425)
        key_b("Bip01 R Forearm", 425)
        key_b("Bip01 R Hand", 425)

        # Frame 500 (20s): Glass lifted to lips, head tilts back 16 deg
        rot_b("Bip01 R UpperArm", 22, -12, 10)
        rot_b("Bip01 R Forearm", -95, 20, 15)
        rot_b("Bip01 R Hand", 25, -20, 20)
        rot_b("Bip01 Head", -16, 0, 0) # Head tilt back
        key_b("Bip01 R UpperArm", 500)
        key_b("Bip01 R Forearm", 500)
        key_b("Bip01 R Hand", 500)
        key_b("Bip01 Head", 500)

        # Frame 600 (24s): Drinking completes, head straightens
        rot_b("Bip01 Head", 0, 0, 0)
        key_b("Bip01 Head", 600)
        key_b("Bip01 R UpperArm", 600)
        key_b("Bip01 R Forearm", 600)
        key_b("Bip01 R Hand", 600)

        # Frame 650 (26s): Glass back down on table
        rot_b("Bip01 R UpperArm", 50, -5, -4)
        rot_b("Bip01 R Forearm", -60, 15, 0)
        rot_b("Bip01 R Hand", 10, -15, 5)
        key_b("Bip01 R UpperArm", 650)
        key_b("Bip01 R Forearm", 650)
        key_b("Bip01 R Hand", 650)

        # Frame 750 (30s): Hand returns to natural resting posture
        rot_b("Bip01 R UpperArm", 62, 0, -12)
        rot_b("Bip01 R Forearm", -68, 18, 0)
        rot_b("Bip01 R Hand", 0, 0, -15)
        rot_b("Bip01 Head", 0, 0, 0)
        key_b("Bip01 R UpperArm", 750)
        key_b("Bip01 R Forearm", 750)
        key_b("Bip01 R Hand", 750)
        key_b("Bip01 Head", 750)

    # 12. Animated Props Keyframes
    # Copper Jug
    jug_rest = (0.25, -0.08, 0.75)
    jug_pour = (0.10, -0.10, 0.88)

    jug_obj.location = jug_rest
    jug_obj.rotation_euler = (0, 0, 0)
    jug_obj.keyframe_insert(data_path="location", frame=1)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=1)
    jug_obj.keyframe_insert(data_path="location", frame=125)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=125)

    jug_obj.location = jug_pour
    jug_obj.rotation_euler = (math.radians(-10), math.radians(-38), math.radians(12))
    jug_obj.keyframe_insert(data_path="location", frame=250)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=250)
    jug_obj.keyframe_insert(data_path="location", frame=350)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=350)

    jug_obj.location = jug_rest
    jug_obj.rotation_euler = (0, 0, 0)
    jug_obj.keyframe_insert(data_path="location", frame=375)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=375)
    jug_obj.keyframe_insert(data_path="location", frame=750)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    # Water Stream (Visible ONLY frames 250 to 360)
    stream_obj.scale = (0.001, 0.001, 0.001)
    stream_obj.keyframe_insert(data_path="scale", frame=1)
    stream_obj.keyframe_insert(data_path="scale", frame=249)
    stream_obj.scale = (1.0, 1.0, 1.0)
    stream_obj.keyframe_insert(data_path="scale", frame=255)
    stream_obj.keyframe_insert(data_path="scale", frame=355)
    stream_obj.scale = (0.001, 0.001, 0.001)
    stream_obj.keyframe_insert(data_path="scale", frame=360)
    stream_obj.keyframe_insert(data_path="scale", frame=750)

    # Crystal Glass Lifting & Drinking
    glass_table = (-0.06, -0.12, 0.75)
    glass_mouth = (-0.02, 0.22, 1.04)

    glass_obj.location = glass_table
    glass_obj.rotation_euler = (0, 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=1)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=1)
    glass_obj.keyframe_insert(data_path="location", frame=425)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=425)

    glass_obj.location = glass_mouth
    glass_obj.rotation_euler = (math.radians(-28), math.radians(-10), math.radians(5))
    glass_obj.keyframe_insert(data_path="location", frame=500)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=500)
    glass_obj.keyframe_insert(data_path="location", frame=600)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=600)

    glass_obj.location = glass_table
    glass_obj.rotation_euler = (0, 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=650)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=650)
    glass_obj.keyframe_insert(data_path="location", frame=750)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    # Water inside glass (Parented to glass so it moves along with glass)
    water_obj.parent = glass_obj
    water_obj.location = (0, 0, 0.04)

    # Water level scales on Z
    water_obj.scale = (1.0, 1.0, 0.05) # Empty at start
    water_obj.keyframe_insert(data_path="scale", frame=1)
    water_obj.keyframe_insert(data_path="scale", frame=250)

    water_obj.scale = (1.0, 1.0, 0.85) # Filled by pouring
    water_obj.keyframe_insert(data_path="scale", frame=360)
    water_obj.keyframe_insert(data_path="scale", frame=500)

    water_obj.scale = (1.0, 1.0, 0.20) # Lowered by drinking
    water_obj.keyframe_insert(data_path="scale", frame=600)
    water_obj.keyframe_insert(data_path="scale", frame=750)

    # 13. Camera Composition: Frames Full Seated Character, Head, Table, Jug, and Glass
    cam_data = bpy.data.cameras.new("MainCinematicCam")
    cam_data.lens = 35
    cam_obj = bpy.data.objects.new("MainCinematicCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # 0s-5s: Establishing shot
    cam_obj.location = (0.0, -3.8, 1.30)
    cam_obj.rotation_euler = (math.radians(84.5), 0, 0)
    cam_obj.keyframe_insert(data_path="location", frame=1)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=1)

    # 5s-10s: Slow subtle push-in towards table
    cam_obj.location = (0.05, -3.3, 1.25)
    cam_obj.rotation_euler = (math.radians(83.5), 0, math.radians(1))
    cam_obj.keyframe_insert(data_path="location", frame=250)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=250)

    # 10s-15s: Pouring focus
    cam_obj.location = (0.08, -2.9, 1.18)
    cam_obj.rotation_euler = (math.radians(82.0), 0, math.radians(2))
    cam_obj.keyframe_insert(data_path="location", frame=375)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=375)

    # 15s-20s: Crane up tracking lifting glass
    cam_obj.location = (0.0, -3.1, 1.28)
    cam_obj.rotation_euler = (math.radians(83.0), 0, 0)
    cam_obj.keyframe_insert(data_path="location", frame=500)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=500)

    # 20s-25s: Drinking focus
    cam_obj.location = (-0.15, -2.8, 1.32)
    cam_obj.rotation_euler = (math.radians(82.5), 0, math.radians(-3))
    cam_obj.keyframe_insert(data_path="location", frame=625)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=625)

    # 25s-30s: Smooth pull-back reveal to wide establishing shot
    cam_obj.location = (0.0, -3.8, 1.30)
    cam_obj.rotation_euler = (math.radians(84.5), 0, 0)
    cam_obj.keyframe_insert(data_path="location", frame=750)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    print("=== Master 30s Scene v2 Built Successfully: 750 Frames Fully Configured ===")

if __name__ == "__main__":
    build_complete_scene()
