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
    const carto = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
    const lon = Cesium.Math.toDegrees(carto.longitude) + (offset.lon || 0);
    const lat = Cesium.Math.toDegrees(carto.latitude) + (offset.lat || 0);
    const newCenter = Cesium.Cartesian3.fromDegrees(lon, lat, carto.height);
    const translation = Cesium.Cartesian3.subtract(
      newCenter, tileset.boundingSphere.center, new Cesium.Cartesian3()
    );
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
  }

  await viewer.zoomTo(tileset);
  return tileset;
}

export function removeTileset(viewer, tileset) {
  viewer.scene.primitives.remove(tileset);
}
