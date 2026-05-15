import Cesium from 'cesium';

// 3D wall sign — box entities with eyeOffset to prevent occlusion
export function place3DLogo(viewer, name, options = {}) {
  const { lon, lat, alt } = {
    lon: 114.3515, lat: 30.5327, alt: 0,
    ...options,
  };

  // Canvas for signboard texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
  ctx.fill();
  ctx.fillStyle = '#5b9bd5';
  ctx.fillRect(0, 0, 8, canvas.height);
  ctx.font = 'bold 48px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2 + 6, canvas.height / 2);

  // ENU helper
  function localPos(east, north, up) {
    const base = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(base);
    const offset = new Cesium.Cartesian3(east, north, up);
    return Cesium.Matrix4.multiplyByPoint(enuMatrix, offset, new Cesium.Cartesian3());
  }

  // Tall pole to clear buildings (40m)
  const poleH = 40;
  const signW = 10, signD = 0.4, signH = 3.5;

  // eyeOffset pulls entities toward camera to prevent occlusion
  const eyeOff = new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, -800));

  const pole = viewer.entities.add({
    position: localPos(0, 0, poleH / 2),
    eyeOffset: eyeOff,
    box: {
      dimensions: new Cesium.Cartesian3(0.3, 0.3, poleH),
      material: Cesium.Color.fromCssColorString('#334155'),
    },
  });

  const sign = viewer.entities.add({
    position: localPos(0, 0, poleH + signH / 2),
    eyeOffset: eyeOff,
    box: {
      dimensions: new Cesium.Cartesian3(signW, signD, signH),
      material: new Cesium.ImageMaterialProperty({ image: canvas.toDataURL() }),
    },
  });

  viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, 200) });
  return [pole, sign];
}

export function remove3DLogo(viewer, entities) {
  if (Array.isArray(entities)) {
    entities.forEach((e) => viewer.entities.remove(e));
  } else {
    viewer.entities.remove(entities);
  }
}
