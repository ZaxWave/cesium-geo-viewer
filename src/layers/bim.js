import * as Cesium from 'cesium';

// BIM model loader: supports glTF URL OR generates a demo building if no URL
export async function loadBimModel(viewer, url, options = {}) {
  const { lon, lat, alt, scale, heading } = {
    lon: 114.3515, lat: 30.5327, alt: 0,
    scale: 5, heading: 0,
    ...options,
  };

  if (url && url.trim()) {
    // Real BIM model (glTF from IFC/Revit conversion)
    const origin = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    // Pitch +90° rotates from glTF Y-up to Cesium ENU Z-up
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(heading),
      Cesium.Math.toRadians(90),
      0
    );
    const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(origin, hpr);
    const model = await Cesium.Model.fromGltfAsync({
      url,
      modelMatrix,
      scale,
      minimumPixelSize: 128,
      maximumScale: 20000,
    });
    viewer.scene.primitives.add(model);
    model.silhouetteColor = Cesium.Color.fromCssColorString('#2c3e50');
    model.silhouetteSize = 2.0;
    const r = (scale || 5) * 15;
    const dist = Math.max(r * 2.5, 40);
    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(origin, r),
      { offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-35), dist) }
    );
    return model;
  }

  // Fallback: generate a demo multi-story building from primitives
  return createDemoBuilding(viewer, lon, lat, alt);
}

export function removeBimModel(viewer, model) {
  if (Array.isArray(model)) {
    model.forEach((e) => viewer.entities.remove(e));
  } else if (model instanceof Cesium.Entity) {
    viewer.entities.remove(model);
  } else {
    viewer.scene.primitives.remove(model);
  }
}

// Demo building: standalone boxes (no parent-child, avoids render crash)
function createDemoBuilding(viewer, lon, lat, alt) {
  const h = 25, w = 15, d = 12;
  const floors = 5;
  const floorH = h / floors;
  const colors = ['#e76f51', '#e9c46a', '#2a9d8f', '#264653', '#f4a261'];

  // Convert local offsets to world positions via ENU transform
  function localPos(east, north, up) {
    const base = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(base);
    const offset = new Cesium.Cartesian3(east, north, up);
    return Cesium.Matrix4.multiplyByPoint(enuMatrix, offset, new Cesium.Cartesian3());
  }

  // Main building body
  const main = viewer.entities.add({
    position: localPos(0, 0, h / 2),
    box: {
      dimensions: new Cesium.Cartesian3(w, d, h),
      material: Cesium.Color.fromCssColorString('#f5f5f5').withAlpha(0.9),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#999'),
      outlineWidth: 1,
    },
  });

  // Return all entities so they can all be removed
  const allEntities = [main];
  for (let i = 0; i < floors; i++) {
    const z = -h / 2 + floorH * (i + 0.5);
    const stripe = viewer.entities.add({
      position: localPos(0, 0, z),
      box: {
        dimensions: new Cesium.Cartesian3(w + 0.1, d + 0.1, 1.2),
        material: Cesium.Color.fromCssColorString(colors[i]).withAlpha(0.7),
      },
    });
    allEntities.push(stripe);
  }
  const label = viewer.entities.add({
    position: localPos(0, 0, h / 2 + 3),
    label: {
      text: 'BIM Demo\nBuilding',
      font: '14px "PingFang SC","Microsoft YaHei",sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  allEntities.push(label);

  viewer.zoomTo(main);
  return allEntities; // Array — removeBimModel will iterate
}
