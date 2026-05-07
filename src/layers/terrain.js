import * as Cesium from 'cesium';

// No-op terrain — always works, no token needed
export function createDefaultTerrain() {
  return new Cesium.EllipsoidTerrainProvider();
}

// Requires Cesium Ion token in CONFIG.cesiumIonToken
export function createWorldTerrain() {
  return Cesium.CesiumTerrainProvider.fromUrl(
    Cesium.IonResource.fromAssetId(1),
    { requestWaterMask: true, requestVertexNormals: true }
  );
}

export function createLocalTerrain(url) {
  return new Cesium.CesiumTerrainProvider({
    url,
    requestVertexNormals: true,
    requestWaterMask: false,
  });
}
