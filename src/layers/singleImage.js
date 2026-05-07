import * as Cesium from 'cesium';

// Single image as base map overlay
export function createSingleImageLayer(url, options = {}) {
  return new Cesium.SingleTileImageryProvider({
    url,
    rectangle: options.rectangle || Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    ...options,
  });
}
