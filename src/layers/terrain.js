import * as Cesium from 'cesium';

export function createWorldTerrain() {
  return Cesium.createWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  });
}

export function createLocalTerrain(url) {
  return new Cesium.CesiumTerrainProvider({
    url,
    requestVertexNormals: true,
    requestWaterMask: false,
  });
}
