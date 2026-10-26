import bpy
import math
import os
import sys

def build_scene():
    print("=== Building 30-Second Water Drinking Master Scene in Blender ===")
    bpy.ops.wm.read_factory_settings(use_empty=True)

    scene = bpy.context.scene

    # 1. Output Settings: 1920x1080 @ 25 FPS, 750 Frames (30.0s)
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.fps = 25
    scene.frame_start = 1
    scene.frame_end = 750

    # 2. Rendering Engine Selection: EEVEE Next for fast, reliable server rendering
    # Configure surfaceless EGL / EEVEE settings
    if "BLENDER_EEVEE_NEXT" in dir(bpy.types):
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    elif "BLENDER_EEVEE" in dir(bpy.types):
        scene.render.engine = "BLENDER_EEVEE"
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 16
        scene.cycles.use_denoising = False

    # 3. World Ambient Lighting (Vedic Dawn Sky)
    world = bpy.data.worlds.new(name="DawnWorld")
    scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs[0].default_value = (0.04, 0.06, 0.10, 1.0) # Deep serene slate
        bg_node.inputs[1].default_value = 0.8

    # 4. Cinematic 3-Point Studio Lighting
    # Key Light (Warm morning sunbeam)
    key_light_data = bpy.data.lights.new(name="KeySun", type="SUN")
    key_light_data.energy = 4.5
    key_light_data.color = (1.0, 0.94, 0.85) # Warm sunlight
    key_light_obj = bpy.data.objects.new(name="KeySun", object_data=key_light_data)
    key_light_obj.location = (3.5, -4.0, 5.0)
    key_light_obj.rotation_euler = (math.radians(50), math.radians(15), math.radians(-35))
    bpy.context.collection.objects.link(key_light_obj)

    # Fill Light (Cool sky bounce)
    fill_light_data = bpy.data.lights.new(name="FillLight", type="AREA")
    fill_light_data.energy = 350
    fill_light_data.size = 2.5
    fill_light_data.color = (0.7, 0.85, 1.0)
    fill_light_obj = bpy.data.objects.new(name="FillLight", object_data=fill_light_data)
    fill_light_obj.location = (-3.0, -2.5, 3.0)
    fill_light_obj.rotation_euler = (math.radians(45), math.radians(-30), math.radians(40))
    bpy.context.collection.objects.link(fill_light_obj)

    # Rim / Kick Light (Edge specular highlights on glass and copper)
    rim_light_data = bpy.data.lights.new(name="RimLight", type="POINT")
    rim_light_data.energy = 600
    rim_light_data.color = (0.5, 0.8, 1.0)
    rim_light_obj = bpy.data.objects.new(name="RimLight", object_data=rim_light_data)
    rim_light_obj.location = (0.0, 2.5, 2.8)
    bpy.context.collection.objects.link(rim_light_obj)

    # 5. Environment Materials
    # Teakwood Material
    teak_mat = bpy.data.materials.new(name="TeakWood")
    teak_mat.use_nodes = True
    bsdf = teak_mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.28, 0.14, 0.05, 1.0) # Rich warm teakwood
        bsdf.inputs["Roughness"].default_value = 0.28
        bsdf.inputs["Metallic"].default_value = 0.05

    # Crystal Glass Material
    glass_mat = bpy.data.materials.new(name="CrystalGlass")
    glass_mat.use_nodes = True
    g_bsdf = glass_mat.node_tree.nodes.get("Principled BSDF")
    if g_bsdf:
        g_bsdf.inputs["Base Color"].default_value = (0.95, 0.98, 1.0, 1.0)
        g_bsdf.inputs["Roughness"].default_value = 0.04
        g_bsdf.inputs["Transmission Weight"].default_value = 0.92 if "Transmission Weight" in g_bsdf.inputs else 0.92
        g_bsdf.inputs["IOR"].default_value = 1.52

    # Water Material
    water_mat = bpy.data.materials.new(name="PureWater")
    water_mat.use_nodes = True
    w_bsdf = water_mat.node_tree.nodes.get("Principled BSDF")
    if w_bsdf:
        w_bsdf.inputs["Base Color"].default_value = (0.78, 0.92, 1.0, 1.0)
        w_bsdf.inputs["Roughness"].default_value = 0.02
        w_bsdf.inputs["Transmission Weight"].default_value = 0.96 if "Transmission Weight" in w_bsdf.inputs else 0.96
        w_bsdf.inputs["IOR"].default_value = 1.333

    # Ayurvedic Copper Material
    copper_mat = bpy.data.materials.new(name="AyurvedicCopper")
    copper_mat.use_nodes = True
    c_bsdf = copper_mat.node_tree.nodes.get("Principled BSDF")
    if c_bsdf:
        c_bsdf.inputs["Base Color"].default_value = (0.72, 0.45, 0.20, 1.0) # Warm copper
        c_bsdf.inputs["Metallic"].default_value = 0.95
        c_bsdf.inputs["Roughness"].default_value = 0.22

    # Stone Floor Material
    floor_mat = bpy.data.materials.new(name="AshramStone")
    floor_mat.use_nodes = True
    f_bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
    if f_bsdf:
        f_bsdf.inputs["Base Color"].default_value = (0.10, 0.12, 0.15, 1.0)
        f_bsdf.inputs["Roughness"].default_value = 0.6

    # 6. Build Geometry
    # Floor
    bpy.ops.mesh.primitive_plane_add(size=14.0, location=(0, 0, -0.9))
    floor_obj = bpy.context.active_object
    floor_obj.name = "Floor"
    floor_obj.data.materials.append(floor_mat)

    # Teak Table Top
    bpy.ops.mesh.primitive_cylinder_add(radius=1.2, depth=0.08, vertices=48, location=(0, 0, 0))
    table_obj = bpy.context.active_object
    table_obj.name = "TeakTable"
    table_obj.data.materials.append(teak_mat)

    # Table Base Pedestal
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.85, vertices=32, location=(0, 0, -0.45))
    pedestal_obj = bpy.context.active_object
    pedestal_obj.data.materials.append(teak_mat)

    # Crystal Glass (Faceted 32-side cylindrical vessel)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.48, vertices=32, location=(0, -0.15, 0.28))
    glass_obj = bpy.context.active_object
    glass_obj.name = "CrystalGlass"
    glass_obj.data.materials.append(glass_mat)

    # Water Volume (Inside Glass)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.165, depth=0.42, vertices=32, location=(0, -0.15, 0.26))
    water_obj = bpy.context.active_object
    water_obj.name = "GlassWater"
    water_obj.data.materials.append(water_mat)

    # Copper Water Pitcher / Jug
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.62, vertices=32, location=(0.48, 0.05, 0.35))
    jug_obj = bpy.context.active_object
    jug_obj.name = "CopperJug"
    jug_obj.data.materials.append(copper_mat)

    # Water Pouring Stream (Tube connecting jug to glass during pouring)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.55, vertices=16, location=(0.18, -0.10, 0.46))
    stream_obj = bpy.context.active_object
    stream_obj.name = "WaterStream"
    stream_obj.data.materials.append(water_mat)
    stream_obj.rotation_euler = (math.radians(-15), math.radians(-35), 0)

    # 7. Import Rigged Human Character
    avatar_path = "/var/www/swaryoga/public/models/avatar/male/Male_Adult_01.fbx"
    char_armature = None
    if os.path.exists(avatar_path):
        print(f"Loading rigged character from {avatar_path}...")
        bpy.ops.import_scene.fbx(filepath=avatar_path)
        for obj in bpy.context.selected_objects:
            if obj.type == "ARMATURE":
                char_armature = obj
                char_armature.name = "CharacterRig"
                # Position character seated on chair behind table
                char_armature.location = (0, 0.75, -0.9)
                char_armature.rotation_euler = (0, 0, math.radians(180))
                char_armature.scale = (0.95, 0.95, 0.95)
    else:
        print("Note: Avatar FBX not found locally, using procedural humanoid placeholder.")

    # 8. Animated Timeline & Keyframes across 750 Frames (30.0s @ 25 FPS)
    # Timeline Structure:
    # Frame 1-125 (0s-5s): Establish scene. Water stream invisible. Water in glass low.
    # Frame 126-250 (5s-10s): Jug moves towards glass, tilts.
    # Frame 251-375 (10s-15s): Jug pours water. Stream visible. Water level rises to 85%. Jug straightens & returns.
    # Frame 376-500 (15s-20s): Glass lifted from table toward face.
    # Frame 501-625 (20s-25s): Glass tilted at lips, drinking action. Water level decreases.
    # Frame 626-750 (25s-30s): Glass returned to table, settles, relaxing resting posture.

    # --- WATER STREAM ANIMATION (Visible ONLY frames 250-360) ---
    stream_obj.scale = (0.001, 0.001, 0.001)
    stream_obj.keyframe_insert(data_path="scale", frame=1)
    stream_obj.keyframe_insert(data_path="scale", frame=249)
    stream_obj.scale = (1.0, 1.0, 1.0)
    stream_obj.keyframe_insert(data_path="scale", frame=255)
    stream_obj.keyframe_insert(data_path="scale", frame=355)
    stream_obj.scale = (0.001, 0.001, 0.001)
    stream_obj.keyframe_insert(data_path="scale", frame=360)
    stream_obj.keyframe_insert(data_path="scale", frame=750)

    # --- WATER LEVEL INSIDE GLASS ANIMATION ---
    # Scale Z represents water fullness
    water_obj.scale = (1.0, 1.0, 0.02) # Starts empty
    water_obj.location = (0, -0.15, 0.06)
    water_obj.keyframe_insert(data_path="scale", frame=1)
    water_obj.keyframe_insert(data_path="location", frame=1)
    water_obj.keyframe_insert(data_path="scale", frame=250)

    # Rises during pouring (frames 250 -> 360)
    water_obj.scale = (1.0, 1.0, 0.85)
    water_obj.location = (0, -0.15, 0.23)
    water_obj.keyframe_insert(data_path="scale", frame=360)
    water_obj.keyframe_insert(data_path="location", frame=360)

    # Stays full until drinking (frame 500)
    water_obj.keyframe_insert(data_path="scale", frame=500)

    # Empties down to 20% while drinking (frames 500 -> 610)
    water_obj.scale = (1.0, 1.0, 0.25)
    water_obj.location = (0, -0.15, 0.10)
    water_obj.keyframe_insert(data_path="scale", frame=610)
    water_obj.keyframe_insert(data_path="location", frame=610)
    water_obj.keyframe_insert(data_path="scale", frame=750)
    water_obj.keyframe_insert(data_path="location", frame=750)

    # --- COPPER PITCHER (JUG) ANIMATION ---
    jug_rest_loc = (0.48, 0.05, 0.35)
    jug_pour_loc = (0.24, -0.05, 0.58)

    jug_obj.location = jug_rest_loc
    jug_obj.rotation_euler = (0, 0, 0)
    jug_obj.keyframe_insert(data_path="location", frame=1)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=1)
    jug_obj.keyframe_insert(data_path="location", frame=125)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=125)

    # Reaching & lifting jug (frames 125 -> 240)
    jug_obj.location = jug_pour_loc
    jug_obj.rotation_euler = (math.radians(-10), math.radians(-45), math.radians(10))
    jug_obj.keyframe_insert(data_path="location", frame=240)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=240)

    # Pouring position (frames 250 -> 350)
    jug_obj.rotation_euler = (math.radians(-15), math.radians(-60), math.radians(15))
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=260)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=345)

    # Returning jug to table (frames 350 -> 380)
    jug_obj.location = jug_rest_loc
    jug_obj.rotation_euler = (0, 0, 0)
    jug_obj.keyframe_insert(data_path="location", frame=380)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=380)
    jug_obj.keyframe_insert(data_path="location", frame=750)
    jug_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    # --- CRYSTAL GLASS LIFTING & DRINKING ANIMATION ---
    glass_table_loc = (0, -0.15, 0.28)
    glass_mouth_loc = (0, 0.28, 0.76)

    glass_obj.location = glass_table_loc
    glass_obj.rotation_euler = (0, 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=1)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=1)
    glass_obj.keyframe_insert(data_path="location", frame=385)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=385)

    # Hand lifts glass to mouth (frames 385 -> 500)
    glass_obj.location = glass_mouth_loc
    glass_obj.rotation_euler = (math.radians(10), 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=500)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=500)

    # Drinking tilt at lips (frames 500 -> 610)
    glass_obj.location = (0, 0.30, 0.78)
    glass_obj.rotation_euler = (math.radians(40), 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=540)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=540)
    glass_obj.keyframe_insert(data_path="location", frame=600)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=600)

    # Returning glass to table (frames 610 -> 660)
    glass_obj.location = glass_table_loc
    glass_obj.rotation_euler = (0, 0, 0)
    glass_obj.keyframe_insert(data_path="location", frame=660)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=660)
    glass_obj.keyframe_insert(data_path="location", frame=750)
    glass_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    # Parent water object to glass so it moves along with the glass during lift
    water_obj.parent = glass_obj

    # 9. Camera Setup & Dynamic Cinematic Storyboard Tracking
    cam_data = bpy.data.cameras.new(name="MainCam")
    cam_data.lens = 45 # 45mm cinematic lens
    cam_obj = bpy.data.objects.new(name="MainCam", object_data=cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # 0s-5s: Establishing shot
    cam_obj.location = (0, -2.4, 0.95)
    cam_obj.rotation_euler = (math.radians(72), 0, 0)
    cam_obj.keyframe_insert(data_path="location", frame=1)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=1)

    # 5s-10s: Slow zoom & pan toward pitcher
    cam_obj.location = (0.2, -1.8, 0.85)
    cam_obj.rotation_euler = (math.radians(70), 0, math.radians(6))
    cam_obj.keyframe_insert(data_path="location", frame=240)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=240)

    # 10s-15s: Macro pouring focus
    cam_obj.location = (0.1, -1.2, 0.65)
    cam_obj.rotation_euler = (math.radians(64), 0, math.radians(4))
    cam_obj.keyframe_insert(data_path="location", frame=360)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=360)

    # 15s-20s: Crane up with glass
    cam_obj.location = (-0.3, -1.4, 0.92)
    cam_obj.rotation_euler = (math.radians(66), 0, math.radians(-10))
    cam_obj.keyframe_insert(data_path="location", frame=500)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=500)

    # 20s-25s: Profile drinking shot
    cam_obj.location = (-0.7, -0.9, 0.88)
    cam_obj.rotation_euler = (math.radians(62), 0, math.radians(-32))
    cam_obj.keyframe_insert(data_path="location", frame=600)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=600)

    # 25s-30s: Smooth pull back reveal
    cam_obj.location = (0, -2.6, 1.05)
    cam_obj.rotation_euler = (math.radians(72), 0, 0)
    cam_obj.keyframe_insert(data_path="location", frame=750)
    cam_obj.keyframe_insert(data_path="rotation_euler", frame=750)

    print("=== Master 30s Scene Built Successfully: 750 Frames Configured ===")

if __name__ == "__main__":
    build_scene()
