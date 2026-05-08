import ifcopenshell
import ifcopenshell.geom
import numpy as np
import trimesh
import sys
import os

def ifc_to_glb(ifc_path, output_path):
    print(f"Opening: {ifc_path}")
    ifc_file = ifcopenshell.open(ifc_path)

    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)
    settings.set(settings.WELD_VERTICES, True)
    try:
        settings.set(settings.INCLUDE_NORMALS, True)
    except:
        pass

    iterator = ifcopenshell.geom.iterator(settings, ifc_file)

    all_verts = []
    all_norms = []
    all_faces = []
    v_offset = 0

    if not iterator.initialize():
        raise Exception("Failed to initialize iterator")

    while True:
        shape = iterator.get()
        if not shape:
            break
        geom = shape.geometry

        verts = np.array(geom.verts, dtype=np.float64).reshape(-1, 3)
        all_verts.append(verts)

        try:
            norms = np.array(geom.normals, dtype=np.float64).reshape(-1, 3)
        except:
            norms = np.zeros_like(verts)
            norms[:, 2] = 1.0
        all_norms.append(norms)

        faces = np.array(geom.faces, dtype=np.int32).reshape(-1, 3) + v_offset
        all_faces.append(faces)

        v_offset += len(verts)

        if not iterator.next():
            break

    if not all_verts:
        raise Exception("No geometry extracted")

    verts_cat = np.vstack(all_verts)
    norms_cat = np.vstack(all_norms)
    faces_cat = np.vstack(all_faces)

    # Compute normals if all are default (0,0,1)
    if np.allclose(norms_cat[:, 2], 1.0) and np.allclose(norms_cat[:, :2], 0.0):
        print(f"Computing smooth normals for {len(verts_cat)} verts...")
        mesh_temp = trimesh.Trimesh(vertices=verts_cat, faces=faces_cat, process=False)
        norms_cat = mesh_temp.vertex_normals.astype(np.float64)

    print(f"Mesh: {len(verts_cat)} verts, {len(faces_cat)} faces")

    # Build mesh with normals
    mesh = trimesh.Trimesh(
        vertices=verts_cat,
        faces=faces_cat,
        vertex_normals=norms_cat,
        process=False
    )

    # Set a neutral gray color
    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=np.array([210, 210, 210, 255], dtype=np.uint8))

    # Export to GLB
    mesh.export(output_path, file_type='glb')
    size_kb = os.path.getsize(output_path) / 1024
    print(f"Saved: {output_path} ({size_kb:.0f} KB)")

if __name__ == '__main__':
    models_dir = r"E:\Desktop\时空大数据平台技术\CesiumProject\public\data\Models"

    if len(sys.argv) >= 3:
        src = sys.argv[1]
        dst = sys.argv[2]
        files = [(os.path.join(models_dir, src) if not os.path.isabs(src) else src,
                  os.path.join(models_dir, dst) if not os.path.isabs(dst) else dst)]
    else:
        files = [
            ("IfcOpenHouse.ifc", "IfcOpenHouse_v2.glb"),
            ("Ghasem.ifc", "Ghasem_v2.glb"),
            ("rac_basic_sample_project.ifc", "rac_basic_sample_project_v2.glb"),
        ]
        files = [(os.path.join(models_dir, s), os.path.join(models_dir, d)) for s, d in files]

    for src, dst in files:
        if not os.path.exists(src):
            print(f"NOT FOUND: {src}")
            continue
        ifc_to_glb(src, dst)
