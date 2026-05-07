import * as Cesium from 'cesium';

// glTF / GLB 3D model
export async function loadGltf(viewer, url, options = {}) {
  const model = await Cesium.Model.fromGltfAsync({
    url,
    scale: options.scale || 1,
    minimumPixelSize: options.minimumPixelSize || 64,
    ...options,
  });
  viewer.scene.primitives.add(model);
  await viewer.zoomTo(model);
  return model;
}

export function removeGltf(viewer, model) {
  viewer.scene.primitives.remove(model);
}
