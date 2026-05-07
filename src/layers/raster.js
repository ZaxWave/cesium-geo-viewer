import * as Cesium from 'cesium';
import { createWmsLayer } from './ogc.js';

// GeoTIFF via GeoServer WMS (recommended for large files)
export function loadGeoTiffViaWms(viewer, geoserverLayer, options = {}) {
  const provider = createWmsLayer(
    'http://localhost:8080/geoserver/ows',
    geoserverLayer,
    { ...options }
  );
  const layer = viewer.imageryLayers.addImageryProvider(provider);
  return layer;
}
