import Cesium from 'cesium';

const PI = Math.PI;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function isInChina(lon, lat) {
  return lon >= 72.004 && lon <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}

function transformLon(x, y) {
  let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  r += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return r;
}

function transformLat(x, y) {
  let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  r += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return r;
}

function delta(lon, lat) {
  const dlon = transformLon(lon - 105.0, lat - 35.0);
  const dlat = transformLat(lon - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  const magic = 1 - EE * Math.sin(radLat) * Math.sin(radLat);
  const sqrtMagic = Math.sqrt(magic);
  return [
    (dlon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI),
    (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI),
  ];
}

export function wgs84ToGcj02(lon, lat) {
  if (!isInChina(lon, lat)) return [lon, lat];
  const [dLon, dLat] = delta(lon, lat);
  return [lon + dLon, lat + dLat];
}

export function gcj02ToWgs84(lon, lat) {
  if (!isInChina(lon, lat)) return [lon, lat];
  let wgsLon = lon, wgsLat = lat;
  for (let i = 0; i < 5; i++) {
    const [gcjLon, gcjLat] = wgs84ToGcj02(wgsLon, wgsLat);
    wgsLon += lon - gcjLon;
    wgsLat += lat - gcjLat;
  }
  return [wgsLon, wgsLat];
}

// Web Mercator tile ↔ lon/lat helpers
function tileCenterToLonLat(tx, ty, tz) {
  const n = Math.pow(2, tz);
  const lon = (tx + 0.5) / n * 360.0 - 180.0;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + 0.5) / n)));
  return [lon, latRad * 180 / PI];
}

function lonLatToTile(lon, lat, tz) {
  const n = Math.pow(2, tz);
  const tx = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * PI / 180;
  const ty = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / PI) / 2 * n);
  return [tx, ty];
}

// Create a GCJ-02 "undistorted" Gaode imagery provider
// For each WGS84 tile, we request the Gaode tile that covers the GCJ-02-shifted position,
// effectively pulling Gaode tiles back to WGS84 alignment.
export function createGcj02CorrectedGaodeProvider(style, subdomains) {
  const base = new Cesium.UrlTemplateImageryProvider({
    url: `https://webst0{s}.is.autonavi.com/appmaptile?style=${style}&x={x}&y={y}&z={z}`,
    subdomains: subdomains || ['1', '2', '3', '4'],
    maximumLevel: 18,
  });

  const _requestImage = base.requestImage.bind(base);

  base.requestImage = function (x, y, level, request) {
    const [wgsLon, wgsLat] = tileCenterToLonLat(x, y, level);
    if (!isInChina(wgsLon, wgsLat)) {
      return _requestImage(x, y, level, request);
    }
    const [gcjLon, gcjLat] = wgs84ToGcj02(wgsLon, wgsLat);
    const [gcjX, gcjY] = lonLatToTile(gcjLon, gcjLat, level);
    const clampedX = Math.max(0, Math.min((1 << level) - 1, gcjX));
    const clampedY = Math.max(0, Math.min((1 << level) - 1, gcjY));
    return _requestImage(clampedX, clampedY, level, request);
  };

  return base;
}

// GCJ-02 corrected Tianditu provider — same principle as Gaode:
// pull GCJ-02 tiles back to WGS84 alignment
export function createGcj02CorrectedTiandituProvider(urlTemplate, subdomains, maximumLevel) {
  const base = new Cesium.UrlTemplateImageryProvider({
    url: urlTemplate,
    subdomains: subdomains || [],
    maximumLevel: maximumLevel || 18,
  });

  const _requestImage = base.requestImage.bind(base);

  base.requestImage = function (x, y, level, request) {
    const [wgsLon, wgsLat] = tileCenterToLonLat(x, y, level);
    if (!isInChina(wgsLon, wgsLat)) {
      return _requestImage(x, y, level, request);
    }
    const [gcjLon, gcjLat] = wgs84ToGcj02(wgsLon, wgsLat);
    const [gcjX, gcjY] = lonLatToTile(gcjLon, gcjLat, level);
    const clampedX = Math.max(0, Math.min((1 << level) - 1, gcjX));
    const clampedY = Math.max(0, Math.min((1 << level) - 1, gcjY));
    return _requestImage(clampedX, clampedY, level, request);
  };

  return base;
}
