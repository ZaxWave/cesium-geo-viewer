import * as Cesium from 'cesium';

export function createWorldTerrain() {
  return Cesium.CesiumTerrainProvider.fromUrl(
    Cesium.IonResource.fromAssetId(1),
    {
      requestWaterMask: true,
      requestVertexNormals: true,
    }
  );
}

export function createLocalTerrain(url) {
  return new Cesium.CesiumTerrainProvider({
    url,
    requestVertexNormals: true,
    requestWaterMask: false,
  });
}
