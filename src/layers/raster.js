import * as Cesium from 'cesium';
import { CONFIG } from '../config.js';
import { createWmsLayer } from './ogc.js';

// GeoTIFF via GeoServer WMS (recommended for large files)
export function loadGeoTiffViaWms(viewer, geoserverLayer, options = {}) {
  const provider = createWmsLayer(
    `${CONFIG.geoserverUrl}/ows`,
    geoserverLayer,
    options
  );
  const layer = viewer.imageryLayers.addImageryProvider(provider);
  return layer;
}
