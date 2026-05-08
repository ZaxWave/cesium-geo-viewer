import * as Cesium from 'cesium';

// glTF / GLB 3D model
export async function loadGltf(viewer, url, options = {}) {
  const { lon, lat, alt, scale } = {
    lon: 114.3515, lat: 30.5327, alt: 0,
    scale: 5,
    ...options,
  };

  const origin = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
  // Pitch +90° rotates from glTF Y-up to Cesium ENU Z-up
  const hpr = new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(90), 0);
  const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(origin, hpr);

  const model = await Cesium.Model.fromGltfAsync({
    url,
    modelMatrix,
    scale,
    minimumPixelSize: options.minimumPixelSize || 100,
    maximumScale: options.maximumScale || 500,
  });
  viewer.scene.primitives.add(model);
  model.silhouetteColor = Cesium.Color.fromCssColorString('#2c3e50');
  model.silhouetteSize = 2.0;
  const r = (options.scale || 5) * 15;
  const dist = Math.max(r * 2.5, 40);
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(origin, r),
    { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), dist) }
  );
  return model;
}

export function removeGltf(viewer, model) {
  viewer.scene.primitives.remove(model);
}
