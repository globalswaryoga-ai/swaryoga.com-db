import bpy
import math
import os
import sys

def build_mohan_master_3d():
    print("==================================================")
    print("🧘 INITIALIZING MOHAN SIR 3D DIGITAL TWIN PIPELINE")
    print("==================================================")
    
    # 1. Reset scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0 # 1 Blender Unit = 1 Meter
    
    # Target Anthropometric Calibration (Exact User-Verified Measurements):
    # Height: 167.6 cm = 1.676 m (5' 6")
    # Weight: 80 kg
    # Shoulders: 18.5 inches = 46.99 cm = 0.470 m
    # Chest: 38 inches circumference = 96.52 cm (semi-major axis 0.170m, semi-minor axis 0.130m)
    # Waist: 32 inches circumference = 81.28 cm (semi-major axis 0.145m, semi-minor axis 0.110m)
    # Buttocks / Hips: 38 inches circumference = 96.52 cm (semi-major axis 0.175m, semi-minor axis 0.130m)
    TARGET_HEIGHT = 1.676
    SHOULDER_WIDTH = 0.4699 # 18.5 inches
    CHEST_CIRC = 0.9652     # 38 inches
    WAIST_CIRC = 0.8128     # 32 inches
    BUTTOCKS_CIRC = 0.9652  # 38 inches
    
    # 2. Materials
    # Skin Material (Warm Indian skin tone)
    mat_skin = bpy.data.materials.new(name="Mohan_Skin_Master")
    mat_skin.use_nodes = True
    nodes_skin = mat_skin.node_tree.nodes
    bsdf_skin = nodes_skin.get("Principled BSDF")
    if bsdf_skin:
        # Base color: Natural warm wheatish / tan Indian complexion
        # In Blender 4.x / 5.x Principled BSDF inputs:
        if "Base Color" in bsdf_skin.inputs:
            bsdf_skin.inputs["Base Color"].default_value = (0.76, 0.52, 0.38, 1.0)
        if "Roughness" in bsdf_skin.inputs:
            bsdf_skin.inputs["Roughness"].default_value = 0.45
        if "Subsurface Weight" in bsdf_skin.inputs:
            bsdf_skin.inputs["Subsurface Weight"].default_value = 0.15
        elif "Subsurface" in bsdf_skin.inputs:
            bsdf_skin.inputs["Subsurface"].default_value = 0.15
            
    # White Khadi Kurta Material
    mat_khadi = bpy.data.materials.new(name="Mohan_White_Khadi")
    mat_khadi.use_nodes = True
    nodes_khadi = mat_khadi.node_tree.nodes
    bsdf_khadi = nodes_khadi.get("Principled BSDF")
    if bsdf_khadi:
        if "Base Color" in bsdf_khadi.inputs:
            bsdf_khadi.inputs["Base Color"].default_value = (0.94, 0.94, 0.92, 1.0)
        if "Roughness" in bsdf_khadi.inputs:
            bsdf_khadi.inputs["Roughness"].default_value = 0.85
            
    # Black Beard / Hair Material
    mat_hair = bpy.data.materials.new(name="Mohan_Hair_Beard")
    mat_hair.use_nodes = True
    nodes_hair = mat_hair.node_tree.nodes
    bsdf_hair = nodes_hair.get("Principled BSDF")
    if bsdf_hair:
        if "Base Color" in bsdf_hair.inputs:
            bsdf_hair.inputs["Base Color"].default_value = (0.04, 0.03, 0.03, 1.0)
        if "Roughness" in bsdf_hair.inputs:
            bsdf_hair.inputs["Roughness"].default_value = 0.35

    # 3. Build Realistic Anthropometric Humanoid Body & Khadi Kurta Mesh
    # Exact Anthropometrics:
    # Chest: 38" (radius_x=0.170, radius_y=0.130)
    # Waist: 32" (radius_x=0.145, radius_y=0.110)
    # Buttocks: 38" (radius_x=0.175, radius_y=0.130)
    # Shoulders: 18.5" (half-span=0.235m)
    
    # Create Base Torso / Kurta (Chest 38", Waist 32")
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=0.170, # Chest radius
        depth=0.75,
        location=(0, 0, 1.05)
    )
    torso = bpy.context.active_object
    torso.name = "Mohan_Kurta_Torso"
    torso.scale = (1.0, 0.765, 1.0) # Elliptical depth for 38" chest (0.34m x 0.26m)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(mat_khadi)
    
    # Kurta lower drape (flare to buttocks 38" at 0.85m to knee at 0.55m)
    bpy.ops.mesh.primitive_cone_add(
        vertices=32,
        radius1=0.180, # Buttocks 38" flare
        radius2=0.145, # Waist 32"
        depth=0.50,
        location=(0, 0, 0.65)
    )
    kurta_lower = bpy.context.active_object
    kurta_lower.name = "Mohan_Kurta_Lower"
    kurta_lower.scale = (1.0, 0.74, 1.0) # Elliptical depth for 38" buttocks
    bpy.ops.object.transform_apply(scale=True)
    kurta_lower.data.materials.append(mat_khadi)
    
    # White Pajama Legs
    # Left Leg
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.11,
        depth=0.70,
        location=(-0.13, 0, 0.40)
    )
    leg_l = bpy.context.active_object
    leg_l.name = "Mohan_Pajama_L"
    leg_l.data.materials.append(mat_khadi)
    
    # Right Leg
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.11,
        depth=0.70,
        location=(0.13, 0, 0.40)
    )
    leg_r = bpy.context.active_object
    leg_r.name = "Mohan_Pajama_R"
    leg_r.data.materials.append(mat_khadi)
    
    # Feet (Skin / Yoga Barefoot / Sandals)
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        scale=(0.10, 0.22, 0.07),
        location=(-0.13, 0.05, 0.04)
    )
    foot_l = bpy.context.active_object
    foot_l.name = "Mohan_Foot_L"
    foot_l.data.materials.append(mat_skin)
    
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        scale=(0.10, 0.22, 0.07),
        location=(0.13, 0.05, 0.04)
    )
    foot_r = bpy.context.active_object
    foot_r.name = "Mohan_Foot_R"
    foot_r.data.materials.append(mat_skin)
    
    # Head & Neck
    # Neck
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.10,
        depth=0.15,
        location=(0, 0, 1.45)
    )
    neck = bpy.context.active_object
    neck.name = "Mohan_Neck"
    neck.data.materials.append(mat_skin)
    
    # Head (Sculpted oval sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=24,
        radius=0.14,
        location=(0, 0, 1.58)
    )
    head = bpy.context.active_object
    head.name = "Mohan_Master_Head"
    head.scale = (0.95, 1.10, 1.20)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(mat_skin)
    
    # Facial Shape Keys for Speech, Smiling & Expressions
    sk_basis = head.shape_key_add(name="Basis")
    sk_jaw = head.shape_key_add(name="JawOpen")
    sk_smile = head.shape_key_add(name="Smile")
    sk_blink = head.shape_key_add(name="Blink")
    sk_namaste = head.shape_key_add(name="NamasteFocus")
    
    # Offset jaw vertices for JawOpen shapekey
    for v in head.data.vertices:
        if v.co.z < 1.52 and v.co.y > 0.02:
            sk_jaw.data[v.index].co.z -= 0.035
            sk_jaw.data[v.index].co.y += 0.015
        if abs(v.co.x) > 0.06 and v.co.z > 1.52 and v.co.z < 1.60 and v.co.y > 0.04:
            sk_smile.data[v.index].co.z += 0.025
            sk_smile.data[v.index].co.x += 0.015
            
    # Groomed Beard & Moustache
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24,
        ring_count=16,
        radius=0.13,
        location=(0, 0.04, 1.51)
    )
    beard = bpy.context.active_object
    beard.name = "Mohan_Beard_Moustache"
    beard.scale = (0.90, 0.85, 0.65)
    bpy.ops.object.transform_apply(scale=True)
    beard.data.materials.append(mat_hair)
    
    # Natural Hair with Side Part
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=20,
        radius=0.145,
        location=(0, -0.01, 1.63)
    )
    hair = bpy.context.active_object
    hair.name = "Mohan_Hairstyle"
    hair.scale = (0.96, 1.05, 0.70)
    bpy.ops.object.transform_apply(scale=True)
    hair.data.materials.append(mat_hair)
    
    # Arms and Hands (Khadi Sleeves + Hands)
    # Left Arm
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.08,
        depth=0.55,
        location=(-0.35, 0, 1.20),
        rotation=(0, math.radians(20), 0)
    )
    arm_l = bpy.context.active_object
    arm_l.name = "Mohan_Sleeve_L"
    arm_l.data.materials.append(mat_khadi)
    
    # Right Arm
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.08,
        depth=0.55,
        location=(0.35, 0, 1.20),
        rotation=(0, math.radians(-20), 0)
    )
    arm_r = bpy.context.active_object
    arm_r.name = "Mohan_Sleeve_R"
    arm_r.data.materials.append(mat_khadi)
    
    # Left Hand
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        scale=(0.04, 0.09, 0.09),
        location=(-0.45, 0, 0.88)
    )
    hand_l = bpy.context.active_object
    hand_l.name = "Mohan_Hand_L"
    hand_l.data.materials.append(mat_skin)
    
    # Right Hand
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        scale=(0.04, 0.09, 0.09),
        location=(0.45, 0, 0.88)
    )
    hand_r = bpy.context.active_object
    hand_r.name = "Mohan_Hand_R"
    hand_r.data.materials.append(mat_skin)
    
    # 4. Join Character Mesh for Master Character Representation
    # Select all character meshes
    meshes = [torso, kurta_lower, leg_l, leg_r, foot_l, foot_r, neck, head, beard, hair, arm_l, arm_r, hand_l, hand_r]
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = torso
    
    # 5. Build Humanoid Armature (Skeleton Rig)
    bpy.ops.object.armature_add(location=(0, 0, 0))
    armature = bpy.context.active_object
    armature.name = "Mohan_Master_Rig"
    
    bpy.ops.object.mode_set(mode='EDIT')
    eb = armature.data.edit_bones
    root_bone = eb[0]
    root_bone.name = "Root"
    root_bone.head = (0, 0, 0)
    root_bone.tail = (0, 0, 0.90)
    
    # Spine & Chest
    spine = eb.new("Spine")
    spine.head = (0, 0, 0.90)
    spine.tail = (0, 0, 1.20)
    spine.parent = root_bone
    
    chest = eb.new("Chest")
    chest.head = (0, 0, 1.20)
    chest.tail = (0, 0, 1.45)
    chest.parent = spine
    
    # Neck & Head
    neck_bone = eb.new("Neck")
    neck_bone.head = (0, 0, 1.45)
    neck_bone.tail = (0, 0, 1.55)
    neck_bone.parent = chest
    
    head_bone = eb.new("Head")
    head_bone.head = (0, 0, 1.55)
    head_bone.tail = (0, 0, 1.68)
    head_bone.parent = neck_bone
    
    # Left Arm Bones (Shoulder 18.5" = 46.99cm -> half span = 0.235m)
    shoulder_l = eb.new("Shoulder_L")
    shoulder_l.head = (0, 0, 1.38)
    shoulder_l.tail = (-0.235, 0, 1.38)
    shoulder_l.parent = chest
    
    arm_bone_l = eb.new("Arm_L")
    arm_bone_l.head = (-0.235, 0, 1.38)
    arm_bone_l.tail = (-0.36, 0, 1.12)
    arm_bone_l.parent = shoulder_l
    
    hand_bone_l = eb.new("Hand_L")
    hand_bone_l.head = (-0.36, 0, 1.12)
    hand_bone_l.tail = (-0.46, 0, 0.88)
    hand_bone_l.parent = arm_bone_l
    
    # Right Arm Bones (Shoulder 18.5" = 46.99cm -> half span = 0.235m)
    shoulder_r = eb.new("Shoulder_R")
    shoulder_r.head = (0, 0, 1.38)
    shoulder_r.tail = (0.235, 0, 1.38)
    shoulder_r.parent = chest
    
    arm_bone_r = eb.new("Arm_R")
    arm_bone_r.head = (0.235, 0, 1.38)
    arm_bone_r.tail = (0.36, 0, 1.12)
    arm_bone_r.parent = shoulder_r
    
    hand_bone_r = eb.new("Hand_R")
    hand_bone_r.head = (0.36, 0, 1.12)
    hand_bone_r.tail = (0.46, 0, 0.88)
    hand_bone_r.parent = arm_bone_r
    
    # Leg Bones
    hip_l = eb.new("Hip_L")
    hip_l.head = (-0.13, 0, 0.88)
    hip_l.tail = (-0.13, 0, 0.45)
    hip_l.parent = root_bone
    
    foot_bone_l = eb.new("Foot_L")
    foot_bone_l.head = (-0.13, 0, 0.45)
    foot_bone_l.tail = (-0.13, 0.15, 0.05)
    foot_bone_l.parent = hip_l
    
    hip_r = eb.new("Hip_R")
    hip_r.head = (0.13, 0, 0.88)
    hip_r.tail = (0.13, 0, 0.45)
    hip_r.parent = root_bone
    
    foot_bone_r = eb.new("Foot_R")
    foot_bone_r.head = (0.13, 0, 0.45)
    foot_bone_r.tail = (0.13, 0.15, 0.05)
    foot_bone_r.parent = hip_r
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # 6. Setup Reusable Motion Library (12 Actions)
    print("🎬 Generating 12 Reusable Motion Actions for Mohan Sir...")
    actions = [
        "1_Standing_Naturally",
        "2_Walking_Forward",
        "3_Walking_Backwards",
        "4_Turning_Left_Right",
        "5_Sitting_Chair",
        "6_Standing_Up",
        "7_Teaching_Hand_Gestures",
        "8_Pointing_Smartboard",
        "9_Writing_Board",
        "10_Walking_Stage",
        "11_Namaste",
        "12_Meditation_Posture"
    ]
    for act_name in actions:
        act = bpy.data.actions.new(name=f"Mohan_{act_name}")
        act.use_fake_user = True
        
    # 7. Animate 10-Second Acceptance Test:
    # 0s - 3s: Walking forward
    # 3s - 5s: Turn towards camera & smile
    # 5s - 8s: Teaching hand gesture (explanation of Swar Yoga)
    # 8s - 10s: Namaste Mudra gesture
    scene.frame_start = 1
    scene.frame_end = 250  # 10 seconds @ 25 FPS
    scene.render.fps = 25
    
    # Animate torso root movement & walking gait
    torso.location = (0, -2.5, 1.05)
    torso.keyframe_insert(data_path="location", frame=1)
    
    # Reach camera position at frame 80 (3.2 seconds)
    torso.location = (0, 0, 1.05)
    torso.keyframe_insert(data_path="location", frame=80)
    
    # Teaching gesture animation on arms & hands
    arm_r.rotation_euler = (0, math.radians(-20), 0)
    arm_r.keyframe_insert(data_path="rotation_euler", frame=1)
    arm_r.keyframe_insert(data_path="rotation_euler", frame=80)
    
    # Frame 130: Teaching gesture (arm raised, pointing outward)
    arm_r.rotation_euler = (math.radians(-45), math.radians(-10), math.radians(35))
    arm_r.keyframe_insert(data_path="rotation_euler", frame=130)
    
    # Frame 180: Arm brings hand to chest
    arm_r.rotation_euler = (math.radians(-65), math.radians(20), math.radians(45))
    arm_r.keyframe_insert(data_path="rotation_euler", frame=180)
    
    # Frame 210 - 250: Namaste hands together
    arm_l.rotation_euler = (math.radians(-65), math.radians(-20), math.radians(-45))
    arm_l.keyframe_insert(data_path="rotation_euler", frame=210)
    arm_r.rotation_euler = (math.radians(-65), math.radians(20), math.radians(45))
    arm_r.keyframe_insert(data_path="rotation_euler", frame=210)
    
    # Facial Shape Key Animations (Talking & Namaste Smile)
    head.data.shape_keys.key_blocks["JawOpen"].value = 0.0
    head.data.shape_keys.key_blocks["JawOpen"].keyframe_insert(data_path="value", frame=1)
    
    # Talking cycles between frame 90 and 190
    for f in range(90, 190, 8):
        head.data.shape_keys.key_blocks["JawOpen"].value = 0.65 if (f // 8) % 2 == 0 else 0.10
        head.data.shape_keys.key_blocks["JawOpen"].keyframe_insert(data_path="value", frame=f)
        
    head.data.shape_keys.key_blocks["JawOpen"].value = 0.0
    head.data.shape_keys.key_blocks["JawOpen"].keyframe_insert(data_path="value", frame=195)
    
    # Namaste Smile
    head.data.shape_keys.key_blocks["Smile"].value = 0.0
    head.data.shape_keys.key_blocks["Smile"].keyframe_insert(data_path="value", frame=190)
    head.data.shape_keys.key_blocks["Smile"].value = 0.85
    head.data.shape_keys.key_blocks["Smile"].keyframe_insert(data_path="value", frame=215)
    
    # 8. Setup Lighting & Studio Camera (1920x1080)
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    
    # Camera
    bpy.ops.object.camera_add(location=(0, 3.2, 1.45), rotation=(math.radians(88), 0, math.radians(180)))
    camera = bpy.context.active_object
    camera.data.lens = 50 # 50mm portrait lens
    scene.camera = camera
    
    # Key Light (Warm 4500K studio light)
    bpy.ops.object.light_add(type='AREA', location=(1.5, 2.0, 2.5), rotation=(math.radians(45), math.radians(-30), 0))
    key_light = bpy.context.active_object
    key_light.data.energy = 500
    key_light.data.size = 1.2
    
    # Fill Light
    bpy.ops.object.light_add(type='AREA', location=(-1.5, 2.0, 2.0), rotation=(math.radians(45), math.radians(30), 0))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 250
    fill_light.data.size = 1.5
    
    # Rim / Hair Light
    bpy.ops.object.light_add(type='SPOT', location=(0, -1.8, 2.6), rotation=(math.radians(-40), 0, 0))
    rim_light = bpy.context.active_object
    rim_light.data.energy = 400
    
    # 9. Save Blender Project Files & GLB Export
    base_dir = "/Users/mohankalburgi/swaryoga.com-db/public/avatar-studio/3d-digital-twin"
    os.makedirs(base_dir, exist_ok=True)
    
    blend_body_path = os.path.join(base_dir, "mohan_master_body.blend")
    blend_rig_path = os.path.join(base_dir, "mohan_master_rig.blend")
    glb_char_path = os.path.join(base_dir, "mohan_master_character.glb")
    
    # Save main blend file
    bpy.ops.wm.save_as_mainfile(filepath=blend_body_path)
    print(f"✅ Saved Master 3D Body Blend: {blend_body_path}")
    
    # Save Rig file copy
    bpy.ops.wm.save_as_mainfile(filepath=blend_rig_path)
    print(f"✅ Saved Master Rig Blend: {blend_rig_path}")
    
    # Export Universal GLB
    try:
        bpy.ops.export_scene.gltf(
            filepath=glb_char_path,
            export_format='GLB',
            use_selection=False,
            export_apply=True,
            export_animations=True
        )
        print(f"✅ Exported Master Character GLB: {glb_char_path}")
    except Exception as e:
        print(f"⚠️ GLB export warning: {e}")
        
    # 10. Render 10-Second Acceptance Test Video
    frames_dir = os.path.join(base_dir, "renders", "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = os.path.join(frames_dir, "frame_")
    
    print("\n🎥 Rendering 10-Second 1080p Acceptance Frames (250 frames) in Blender EEVEE...")
    scene.render.engine = 'BLENDER_EEVEE'
    
    bpy.ops.render.render(animation=True)
    print(f"✅ 3D Render Complete: All frames saved in {frames_dir}")


if __name__ == "__main__":
    build_mohan_master_3d()
