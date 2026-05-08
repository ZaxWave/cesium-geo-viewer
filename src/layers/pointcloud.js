import * as Cesium from 'cesium';

const BUILDING_DEFAULTS = {
  maximumScreenSpaceError: 16,
  dynamicScreenSpaceError: true,
  dynamicScreenSpaceErrorDensity: 0.00278,
  dynamicScreenSpaceErrorFactor: 4.0,
};

const POINT_CLOUD_DEFAULTS = {
  maximumScreenSpaceError: 4,
};

export async function load3DTileset(viewer, url, options = {}) {
  const defaults = url.includes('pointcloud')
    ? POINT_CLOUD_DEFAULTS
    : BUILDING_DEFAULTS;
  const { offset, ...tilesetOpts } = options;
  const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
    ...defaults,
    ...tilesetOpts,
  });
  viewer.scene.primitives.add(tileset);

  // Manual offset for fine-tuning GCJ-02 / datum alignment
  if (offset) {
    await tileset.readyPromise;
    // Ensure bounding sphere is fully resolved before reading center
    const center = tileset.boundingSphere?.center;
    if (!center || !Cesium.defined(center) ||
        (center.x === 0 && center.y === 0 && center.z === 0)) {
      console.warn('Skipping offset: tileset bounding sphere not ready');
    } else {
      const carto = Cesium.Cartographic.fromCartesian(center);
      if (!Cesium.defined(carto) || isNaN(carto.longitude) || isNaN(carto.latitude)) {
        console.warn('Skipping offset: invalid cartographic from bounding sphere');
      } else {
        const lon = Cesium.Math.toDegrees(carto.longitude) + (offset.lon || 0);
        const lat = Cesium.Math.toDegrees(carto.latitude) + (offset.lat || 0);
        const newCenter = Cesium.Cartesian3.fromDegrees(lon, lat, carto.height || 0);
        const translation = Cesium.Cartesian3.subtract(
          newCenter, center, new Cesium.Cartesian3()
        );
        if (Cesium.Cartesian3.magnitudeSquared(translation) > 0) {
          tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
        }
      }
    }
  }

  try {
    await viewer.zoomTo(tileset);
  } catch (err) {
    console.warn('Camera zoom failed, tileset bounding sphere may be invalid:', err.message);
  }
  return tileset;
}

export function removeTileset(viewer, tileset) {
  viewer.scene.primitives.remove(tileset);
}
