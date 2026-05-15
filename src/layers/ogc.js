import Cesium from 'cesium';
import { CONFIG } from '../config.js';

// ---------- WMS ----------
export function createWmsLayer(url, layers, options = {}) {
  return new Cesium.WebMapServiceImageryProvider({
    url,
    layers,
    parameters: {
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      format: 'image/png',
      transparent: true,
      srs: 'EPSG:4326',
      ...options.parameters,
    },
    ...options,
  });
}

// ---------- WMTS ----------
export function createWmtsLayer(url, layer, options = {}) {
  const maxLevel = options.maximumLevel || 18;
  const tileMatrixLabels = [];
  for (let i = 0; i <= maxLevel; i++) {
    tileMatrixLabels.push(`EPSG:4326:${i}`);
  }
  return new Cesium.WebMapTileServiceImageryProvider({
    url: url.replace('/rest', ''),
    layer,
    style: 'polygon',   // Must match GetCapabilities <Style><Identifier>polygon</Identifier>
    format: 'image/png',
    tileMatrixSetID: 'EPSG:4326',
    tileMatrixLabels,
    tilingScheme: new Cesium.GeographicTilingScheme(),
    maximumLevel: maxLevel,
    ...options,
  });
}

// ---------- TMS ----------
export function createTmsLayer(url, options = {}) {
  // GeoServer TMS serves tiles at {z}/{x}/{y}.png with bottom-origin Y
  // Use EPSG:4326 geographic grid (matches GeoServer GWC gridset)
  return new Cesium.UrlTemplateImageryProvider({
    url: `${url}/{z}/{x}/{reverseY}.png`,
    tilingScheme: new Cesium.GeographicTilingScheme(),
    maximumLevel: 18,
    ...options,
  });
}

// ---------- GeoServer shortcuts ----------
export function createGeoserverWms(layerName, options = {}) {
  return createWmsLayer(`${CONFIG.geoserverUrl}/ows`, layerName, options);
}

export function createGeoserverWmts(layerName, options = {}) {
  return createWmtsLayer(
    `${CONFIG.geoserverUrl}/gwc/service/wmts`,
    layerName,
    options
  );
}

export function createGeoserverTms(layerName, options = {}) {
  return createTmsLayer(
    `${CONFIG.geoserverUrl}/gwc/service/tms/1.0.0/${layerName}@EPSG:4326@png`,
    options
  );
}
