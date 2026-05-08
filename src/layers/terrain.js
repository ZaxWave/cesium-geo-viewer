import * as Cesium from 'cesium';

// No-op terrain — always works, no token needed
export function createDefaultTerrain() {
  return new Cesium.EllipsoidTerrainProvider();
}

// Requires Cesium Ion token in CONFIG.cesiumIonToken
export function createWorldTerrain() {
  return new Cesium.CesiumTerrainProvider({
    url: Cesium.IonResource.fromAssetId(1),
    requestVertexNormals: true,
    requestWaterMask: true,
  });
}

export async function createLocalTerrain(url) {
  return await Cesium.CesiumTerrainProvider.fromUrl(url, {
    requestVertexNormals: true,
    requestWaterMask: false,
  });
}
