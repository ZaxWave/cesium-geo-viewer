import * as Cesium from 'cesium';
import { CONFIG } from '../config.js';

// ---------- WMS ----------
export function createWmsLayer(url, layers, options = {}) {
  return new Cesium.WebMapServiceImageryProvider({
    url,
    layers,
    parameters: {
      service: 'WMS',
      version: '1.3.0',
      request: 'GetMap',
      format: 'image/png',
      transparent: true,
      ...options.parameters,
    },
    ...options,
  });
}

// ---------- WMTS ----------
export function createWmtsLayer(url, layer, options = {}) {
  return new Cesium.WebMapTileServiceImageryProvider({
    url,
    layer,
    style: 'default',
    format: 'image/png',
    tileMatrixSetID: 'EPSG:4326',
    maximumLevel: 18,
    ...options,
  });
}

// ---------- TMS ----------
export function createTmsLayer(url, options = {}) {
  return new Cesium.TileMapServiceImageryProvider({
    url,
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
