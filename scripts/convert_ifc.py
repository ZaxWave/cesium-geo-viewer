"""
IFC to GLB converter with material/color preservation.
Groups geometry by element type color and exports proper PBR materials.
"""
import sys, os, struct, json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ifcopenshell
import ifcopenshell.geom

TYPE_COLORS = {
    'IfcWall': [0.82, 0.80, 0.75],
    'IfcWallStandardCase': [0.82, 0.80, 0.75],
    'IfcSlab': [0.70, 0.70, 0.72],
    'IfcRoof': [0.55, 0.50, 0.45],
    'IfcBeam': [0.65, 0.63, 0.60],
    'IfcColumn': [0.65, 0.63, 0.60],
    'IfcWindow': [0.45, 0.70, 0.85],
    'IfcDoor': [0.55, 0.35, 0.20],
    'IfcStair': [0.75, 0.73, 0.70],
    'IfcStairFlight': [0.75, 0.73, 0.70],
    'IfcRailing': [0.60, 0.60, 0.62],
    'IfcCurtainWall': [0.40, 0.65, 0.80],
    'IfcPlate': [0.72, 0.70, 0.68],
    'IfcMember': [0.68, 0.66, 0.63],
    'IfcCovering': [0.75, 0.73, 0.70],
    'IfcFurnishingElement': [0.70, 0.60, 0.50],
    'IfcFlowSegment': [0.55, 0.58, 0.60],
    'IfcFlowFitting': [0.55, 0.58, 0.60],
    'IfcBuildingElementProxy': [0.78, 0.76, 0.73],
}
DEFAULT_COLOR = (0.78, 0.76, 0.73)


def build_material_color_map(ifc_file):
    """Build a mapping from material ID to RGB color from IFC surface styles."""
    color_map = {}

    for mdr in ifc_file.by_type('IfcMaterialDefinitionRepresentation'):
        mat = mdr.RepresentedMaterial
        if not mat:
            continue
        mat_id = mat.id()

        for rep in mdr.Representations or []:
            # IfcStyledRepresentation
            for item in getattr(rep, 'Items', []) or []:
                # IfcStyledItem
                for style_assign in getattr(item, 'Styles', []) or []:
                    # IfcPresentationStyleAssignment
                    for style in getattr(style_assign, 'Styles', []) or []:
                        if style.is_a('IfcSurfaceStyle'):
                            for s in getattr(style, 'Styles', []) or []:
                                if s.is_a('IfcSurfaceStyleRendering') and hasattr(s, 'SurfaceColour'):
                                    c = s.SurfaceColour
                                    color_map[mat_id] = (c.Red, c.Green, c.Blue)
                                    break

    return color_map


def _is_grayscale(rgb, threshold=0.05):
    """Check if an RGB color is essentially grayscale."""
    r, g, b = rgb
    return abs(r - g) < threshold and abs(g - b) < threshold and abs(r - b) < threshold


def get_color_for_element(element, color_map=None):
    """Get color: use IFC material color if colorful, else type-based color."""
    if color_map:
        try:
            mat = ifcopenshell.util.element.get_material(element)
            if mat:
                candidates = []
                # Direct material match
                if hasattr(mat, 'id') and mat.id() in color_map:
                    candidates.append(color_map[mat.id()])
                # MaterialLayerSetUsage → ForLayerSet → MaterialLayers
                if hasattr(mat, 'ForLayerSet'):
                    for layer in getattr(mat.ForLayerSet, 'MaterialLayers', []) or []:
                        if layer.Material and layer.Material.id() in color_map:
                            candidates.append(color_map[layer.Material.id()])
                # MaterialLayerSet → MaterialLayers
                for layer in getattr(mat, 'MaterialLayers', []) or []:
                    if layer.Material and layer.Material.id() in color_map:
                        candidates.append(color_map[layer.Material.id()])
                # Use first non-grayscale IFC color; if all are gray, skip IFC entirely
                for c in candidates:
                    if not _is_grayscale(c):
                        return c
        except Exception:
            pass
    # Fallback to type-based color
    for tkey in TYPE_COLORS:
        try:
            if element.is_a(tkey):
                return tuple(TYPE_COLORS[tkey])
        except Exception:
            pass
    return DEFAULT_COLOR


def extract_geometry(ifc_path):
    """Extract geometry from IFC, grouped by element-type color.
    Normals are computed after extraction via trimesh."""
    import trimesh

    ifc_file = ifcopenshell.open(ifc_path)
    color_map = build_material_color_map(ifc_file)
    print(f"  IFC material colors found: {len(color_map)}")

    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    settings.set(settings.WELD_VERTICES, True)

    iterator = ifcopenshell.geom.iterator(settings, ifc_file)
    if not iterator.initialize():
        raise Exception("Failed to initialize geometry iterator")

    groups = {}

    while True:
        shape = iterator.get()
        if not shape:
            break

        geom = shape.geometry
        verts = np.array(geom.verts, dtype=np.float32).reshape(-1, 3)

        element = ifc_file.by_guid(shape.guid) if shape.guid else None
        color = get_color_for_element(element, color_map) if element else DEFAULT_COLOR

        if color not in groups:
            groups[color] = {'verts': [], 'faces': [], 'v_offset': 0}

        g = groups[color]
        faces = np.array(geom.faces, dtype=np.int32).reshape(-1, 3) + g['v_offset']
        g['verts'].append(verts)
        g['faces'].append(faces)
        g['v_offset'] += len(verts)

        if not iterator.next():
            break

    if not groups:
        raise Exception("No geometry extracted")

    result = []
    for color, g in groups.items():
        if not g['verts'] or not g['faces']:
            continue
        v = np.vstack(g['verts']).astype(np.float64)
        f = np.vstack(g['faces']).astype(np.int64)
        if len(v) == 0 or len(f) == 0:
            continue
        # Compute vertex normals via trimesh
        mesh_temp = trimesh.Trimesh(vertices=v, faces=f, process=False)
        n = mesh_temp.vertex_normals.astype(np.float32)
        result.append((v.astype(np.float32), n, f.astype(np.int32), color))

    return result


def build_gltf(groups, output_dir, basename):
    """Build glTF + .bin files like IfcOpenHouse.gltf."""
    os.makedirs(output_dir, exist_ok=True)
    all_bin = bytearray()

    material_count = 0
    mesh_count = 0
    all_accessors = []
    all_buffer_views = []
    all_materials = []
    all_meshes = []
    all_nodes = [{"name": "root", "children": []}]

    for verts, norms, faces, color in groups:
        mat_idx = material_count
        material_count += 1
        all_materials.append({
            "name": f"mat_{mat_idx}",
            "pbrMetallicRoughness": {
                "baseColorFactor": [color[0], color[1], color[2], 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.8,
            },
            "doubleSided": True,
        })

        # Index data
        idx_flat = faces.flatten().astype(np.uint32)
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        idx_off = len(all_bin)
        idx_bytes = idx_flat.tobytes()
        all_bin.extend(idx_bytes)

        idx_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0, "byteOffset": idx_off,
            "byteLength": len(idx_bytes), "target": 34963,
        })
        idx_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": idx_bv, "componentType": 5125,
            "count": len(idx_flat), "type": "SCALAR",
            "max": [int(idx_flat.max())], "min": [int(idx_flat.min())],
        })

        # Position data
        pos_bytes = verts.tobytes()
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        pos_off = len(all_bin)
        all_bin.extend(pos_bytes)
        pos_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0, "byteOffset": pos_off,
            "byteLength": len(pos_bytes), "target": 34962,
        })
        pos_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": pos_bv, "componentType": 5126,
            "count": len(verts), "type": "VEC3",
            "max": verts.max(axis=0).tolist(), "min": verts.min(axis=0).tolist(),
        })

        # Normal data
        norm_bytes = norms.tobytes()
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        norm_off = len(all_bin)
        all_bin.extend(norm_bytes)
        norm_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0, "byteOffset": norm_off,
            "byteLength": len(norm_bytes), "target": 34962,
        })
        norm_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": norm_bv, "componentType": 5126,
            "count": len(norms), "type": "VEC3",
            "max": norms.max(axis=0).tolist(), "min": norms.min(axis=0).tolist(),
        })

        mesh_idx = mesh_count
        mesh_count += 1
        all_meshes.append({
            "name": f"mesh_{mesh_idx}",
            "primitives": [{
                "attributes": {"POSITION": pos_acc, "NORMAL": norm_acc},
                "indices": idx_acc, "material": mat_idx, "mode": 4,
            }],
        })
        all_nodes[0]["children"].append(len(all_nodes))
        all_nodes.append({"mesh": mesh_idx, "name": f"node_{mesh_idx}"})

    bin_path = f"{basename}.bin"
    gltf = {
        "asset": {"version": "2.0", "generator": "cesium-project-ifc-converter-v3"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": all_nodes,
        "meshes": all_meshes,
        "materials": all_materials,
        "accessors": all_accessors,
        "bufferViews": all_buffer_views,
        "buffers": [{"byteLength": len(all_bin), "uri": bin_path}],
    }

    gltf_path = os.path.join(output_dir, f"{basename}.gltf")
    with open(gltf_path, 'w', encoding='utf-8') as f:
        json.dump(gltf, f, indent=2, ensure_ascii=False)

    bin_full = os.path.join(output_dir, bin_path)
    with open(bin_full, 'wb') as f:
        f.write(all_bin)

    size_kb = os.path.getsize(bin_full) / 1024
    print(f"  Saved: {gltf_path} + {bin_path} ({size_kb:.0f} KB)")


def build_glb(groups, output_path):
    """Build a GLB binary file manually for maximum compatibility."""
    all_bin = bytearray()
    json_chunks = []

    material_count = 0
    mesh_count = 0
    all_accessors = []
    all_buffer_views = []
    all_materials = []
    all_meshes = []
    all_nodes = [{"name": "root", "children": []}]

    for verts, norms, faces, color in groups:
        mat_idx = material_count
        material_count += 1
        all_materials.append({
            "name": f"mat_{mat_idx}",
            "pbrMetallicRoughness": {
                "baseColorFactor": [color[0], color[1], color[2], 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.8,
            },
            "doubleSided": True,
        })

        # Write binary data for this primitive
        # Index data (32-bit unsigned int)
        idx_flat = faces.flatten().astype(np.uint32)
        # Pad offset if needed
        while len(all_bin) % 4 != 0:
            all_bin.append(0)

        idx_off = len(all_bin)
        idx_bytes = idx_flat.tobytes()
        all_bin.extend(idx_bytes)
        idx_len = len(idx_bytes)

        idx_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_off,
            "byteLength": idx_len,
            "target": 34963,
        })
        idx_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": idx_bv,
            "componentType": 5125,
            "count": len(idx_flat),
            "type": "SCALAR",
            "max": [int(idx_flat.max())],
            "min": [int(idx_flat.min())],
        })

        # Position data (float32 x 3)
        pos_bytes = verts.tobytes()
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        pos_off = len(all_bin)
        all_bin.extend(pos_bytes)
        pos_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0,
            "byteOffset": pos_off,
            "byteLength": len(pos_bytes),
            "target": 34962,
        })
        pos_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": pos_bv,
            "componentType": 5126,
            "count": len(verts),
            "type": "VEC3",
            "max": verts.max(axis=0).tolist(),
            "min": verts.min(axis=0).tolist(),
        })

        # Normal data (float32 x 3)
        norm_bytes = norms.tobytes()
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        norm_off = len(all_bin)
        all_bin.extend(norm_bytes)
        norm_bv = len(all_buffer_views)
        all_buffer_views.append({
            "buffer": 0,
            "byteOffset": norm_off,
            "byteLength": len(norm_bytes),
            "target": 34962,
        })
        norm_acc = len(all_accessors)
        all_accessors.append({
            "bufferView": norm_bv,
            "componentType": 5126,
            "count": len(norms),
            "type": "VEC3",
            "max": norms.max(axis=0).tolist(),
            "min": norms.min(axis=0).tolist(),
        })

        # Mesh primitive
        mesh_idx = mesh_count
        mesh_count += 1
        all_meshes.append({
            "name": f"mesh_{mesh_idx}",
            "primitives": [{
                "attributes": {
                    "POSITION": pos_acc,
                    "NORMAL": norm_acc,
                },
                "indices": idx_acc,
                "material": mat_idx,
                "mode": 4,
            }],
        })
        all_nodes[0]["children"].append(len(all_nodes))
        all_nodes.append({"mesh": mesh_idx, "name": f"node_{mesh_idx}"})

    # Build glTF JSON
    gltf = {
        "asset": {"version": "2.0", "generator": "cesium-project-ifc-converter-v2"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": all_nodes,
        "meshes": all_meshes,
        "materials": all_materials,
        "accessors": all_accessors,
        "bufferViews": all_buffer_views,
        "buffers": [{"byteLength": len(all_bin)}],
    }

    json_str = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False)
    # Pad JSON to 4-byte boundary with space (0x20)
    while len(json_str) % 4 != 0:
        json_str += ' '
    json_bytes = json_str.encode('utf-8')

    # GLB header + JSON chunk + BIN chunk
    glb = bytearray()
    glb.extend(b'glTF')                          # magic
    glb.extend(struct.pack('<I', 2))              # version
    total_len = 12 + 8 + len(json_bytes) + 8 + len(all_bin)
    glb.extend(struct.pack('<I', total_len))      # total length

    # JSON chunk
    glb.extend(struct.pack('<I', len(json_bytes)))
    glb.extend(b'JSON')
    glb.extend(json_bytes)

    # BIN chunk
    glb.extend(struct.pack('<I', len(all_bin)))
    glb.extend(b'BIN\x00')
    glb.extend(all_bin)

    with open(output_path, 'wb') as f:
        f.write(glb)
    size_kb = len(glb) / 1024
    print(f"  Saved: {output_path} ({size_kb:.0f} KB)")


def ifc_to_glb(ifc_path, output_path):
    print(f"Processing: {os.path.basename(ifc_path)}")
    groups = extract_geometry(ifc_path)
    total_verts = sum(len(g[0]) for g in groups)
    total_faces = sum(len(g[2]) for g in groups)
    print(f"  Groups: {len(groups)}, Total: {total_verts} verts, {total_faces} faces")
    build_glb(groups, output_path)


def ifc_to_gltf(ifc_path, output_dir, basename):
    print(f"Processing: {os.path.basename(ifc_path)}")
    groups = extract_geometry(ifc_path)
    total_verts = sum(len(g[0]) for g in groups)
    total_faces = sum(len(g[2]) for g in groups)
    print(f"  Groups: {len(groups)}, Total: {total_verts} verts, {total_faces} faces")
    build_gltf(groups, output_dir, basename)


if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data', 'a671a-main', 'a671a-main', 'IFC\u6570\u636e')
    models_dir = os.path.join(base_dir, 'public', 'data', 'Models')

    if len(sys.argv) >= 4 and sys.argv[1] == '--gltf':
        # python convert_ifc.py --gltf input.ifc output_dir basename
        ifc_to_gltf(sys.argv[2], sys.argv[3], sys.argv[4])
    elif len(sys.argv) >= 3:
        ifc_to_glb(sys.argv[1], sys.argv[2])
    else:
        files = [
            ("IfcOpenHouse.ifc", "IfcOpenHouse_v3.glb"),
            ("Ghasem.ifc", "Ghasem_v3.glb"),
            ("rac_basic_sample_project.ifc", "rac_basic_sample_project_v3.glb"),
        ]
        for src_name, dst_name in files:
            src = os.path.join(data_dir, src_name)
            dst = os.path.join(models_dir, dst_name)
            if not os.path.exists(src):
                print(f"NOT FOUND: {src}")
                continue
            ifc_to_glb(src, dst)
