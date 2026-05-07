export const CONFIG = Object.freeze({
  // API Tokens — fill in as needed
  cesiumIonToken: '',
  bingMapsKey: '',
  tiandituToken: 'e84faf79617295254251840d50c9a98c',
  mapboxToken: '',

  // GeoServer endpoint
  geoserverUrl: 'http://localhost:8080/geoserver',

  // Local terrain tiles URL (e.g. from CesiumLab terrain output)
  localTerrainUrl: '',

  // Data paths relative to /public/
  data: {
    building3DTiles: '/data/3DTiles/tileset.json',
    pointCloud3DTiles: '/data/3DTiles/pointcloud/tileset.json',
    geotiff: '/data/raster/sample.tif',
  },

  // Base layers shown in switcher — comment out any you lack tokens for
  enabledBaseLayers: [
    'gaode_img',
    'gaode_street',
    'tianditu_img',
    'tianditu_vec',
    'osm',
    'bing',
    'mapbox',
  ],
});
