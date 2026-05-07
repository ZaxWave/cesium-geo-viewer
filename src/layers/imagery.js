import * as Cesium from 'cesium';
import { createGcj02CorrectedGaodeProvider } from './gcj02.js';

// ---------- Bing ----------
export function createBingMapsLayer(key, mapStyle) {
  return new Cesium.BingMapsImageryProvider({
    url: 'https://dev.virtualearth.net',
    key,
    mapStyle: mapStyle || Cesium.BingMapsStyle.AERIAL,
  });
}

// ---------- Tianditu ----------
// DataServer XYZ format (works with UrlTemplateImageryProvider)
// Layer: img_w=影像, vec_w=矢量, cia_w=影像注记, cva_w=矢量注记
const TIANDITU_URL =
  'https://t{s}.tianditu.gov.cn/DataServer?T={layer}&x={x}&y={y}&l={z}&tk={tk}';

const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

export function createTiandituLayer(type, token) {
  const url = TIANDITU_URL.replace('{layer}', type).replace('{tk}', token);
  return new Cesium.UrlTemplateImageryProvider({
    url,
    subdomains: TIANDITU_SUBDOMAINS,
    maximumLevel: 18,
  });
}

// ---------- Gaode ----------
const GAODE_SUBDOMAINS = ['1', '2', '3', '4'];

export function createGaodeLayer(style) {
  // GCJ-02 corrected: Gaode tiles are "pulled back" from GCJ-02 to WGS84
  return createGcj02CorrectedGaodeProvider(style, GAODE_SUBDOMAINS);
}

// ---------- OSM ----------
export function createOsmLayer() {
  return new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
  });
}

// ---------- MapBox ----------
export function createMapboxLayer(token, styleId) {
  return new Cesium.MapboxStyleImageryProvider({
    url: 'https://api.mapbox.com/styles/v1/',
    username: 'mapbox',
    styleId: styleId || 'satellite-v9',
    accessToken: token,
  });
}

// ---------- Registry ----------
export const BASE_LAYERS = {
  bing: {
    id: 'bing',
    name: 'Bing Maps',
    factory: (c) => createBingMapsLayer(c.bingMapsKey, Cesium.BingMapsStyle.AERIAL),
    requiresToken: true,
    tokenKey: 'bingMapsKey',
  },
  tianditu_vec: {
    id: 'tianditu_vec',
    name: '天地图矢量',
    factory: (c) => createTiandituLayer('vec_w', c.tiandituToken),
    requiresToken: true,
    tokenKey: 'tiandituToken',
  },
  tianditu_img: {
    id: 'tianditu_img',
    name: '天地图影像',
    factory: (c) => createTiandituLayer('img_w', c.tiandituToken),
    requiresToken: true,
    tokenKey: 'tiandituToken',
  },
  gaode_img: {
    id: 'gaode_img',
    name: '高德影像',
    factory: () => createGaodeLayer(6),
    requiresToken: false,
  },
  gaode_vec: {
    id: 'gaode_vec',
    name: '高德矢量',
    factory: () => createGaodeLayer(8),
    requiresToken: false,
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    factory: () => createOsmLayer(),
    requiresToken: false,
  },
  mapbox: {
    id: 'mapbox',
    name: 'Mapbox Satellite',
    factory: (c) => createMapboxLayer(c.mapboxToken, 'satellite-v9'),
    requiresToken: true,
    tokenKey: 'mapboxToken',
  },
};
