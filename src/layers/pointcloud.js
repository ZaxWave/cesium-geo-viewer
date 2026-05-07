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
  const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
    ...defaults,
    ...options,
  });
  viewer.scene.primitives.add(tileset);
  await viewer.zoomTo(tileset);
  return tileset;
}

export function removeTileset(viewer, tileset) {
  viewer.scene.primitives.remove(tileset);
}
