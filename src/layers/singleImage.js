import * as Cesium from 'cesium';

export function createSingleImageLayer(url, options = {}) {
  const provider = new Cesium.SingleTileImageryProvider({
    url,
    rectangle: options.rectangle || Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    tileWidth: options.tileWidth || 2048,
    tileHeight: options.tileHeight || 1024,
    ...options,
  });

  provider.errorEvent.addEventListener((error) => {
    console.error('SingleImage load error:', error);
  });

  return provider;
}
