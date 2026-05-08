export const CONFIG = Object.freeze({
  // API Tokens — fill in as needed
  cesiumIonToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjNmIxOWRjYS04MzA4LTRhN2EtODMwZi0yMDVhN2JhNzAxNWYiLCJpZCI6NDI4NTE0LCJpc3MiOiJodHRwczovL2lvbi5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3NzgxNzA1NDh9.bgjWGLRIoi32H5aljT-lNwqK8pY3shyo3YkNQfAQYyI',
  bingMapsKey: '',
  tiandituToken: 'e84faf79617295254251840d50c9a98c',
  mapboxToken: '',

  // GeoServer endpoint
  geoserverUrl: '/geoserver',

  // GeoServer layer presets
  geoserver: {
    wmsUrl: '/geoserver/ows',
    wmsLayer: 'lab5:xian',
    wmtsUrl: '/geoserver/gwc/service/wmts/rest',
    wmtsLayer: 'lab5:xian',
    tmsUrl: '/geoserver/gwc/service/tms/1.0.0/',
    tmsPath: 'lab5:xian@EPSG:4326@png',
    tiffLayer: 'lab5:时空大数据平台数据2',
    // Camera fly-to centers [lon, lat, alt]
    xianCenter: [108.94, 34.26, 15000],
    hubeiCenter: [114.30, 30.60, 15000],
  },

  // Local terrain tiles URL (e.g. from CesiumLab terrain output)
  localTerrainUrl: '',

  // Data paths relative to /public/
  data: {
    building3DTiles: '/data/3DTiles/tileset.json',
    pointCloudWGS84: '/data/3DTiles/tileset.json',
    pointCloudGCJ02: '/data/3DTiles_gcj02/tileset.json',
    // Manual fine-tune offset for GCJ-02 point cloud (degrees, adjust to match)
    pointCloudGCJ02Offset: { lon: 0, lat: 0 },
    geotiff: '/data/raster/sample.tif',
    // 武汉大学信息学部倾斜摄影模型 (3D Tiles)
    whuOblique: '/data/whu_oblique/tileset.json',
    gltf: '/data/Models/IfcOpenHouse_v2.glb',
    czml: '/data/CZML/e8fbf-main/satelliteTY/satelliteTY/czml/satellite.czml',
    singleImage: '/data/Vector/sample.jpg',
    // BIM model (IFC → GLB)
    bim: '/data/Models/rac_basic_sample_project_v2.glb',
    // 3D LOGO display name
    logoName: '',
  },

  // 武汉大学信息学部 — 倾斜模型相机位置 [lon, lat, alt]
  whuCenter: [114.3515, 30.5327, 800],
  // 3D LOGO 放置位置 — 友谊广场 [lon, lat, alt]
  logoPosition: [114.355706, 30.527382, 0],

  // Base layers shown in switcher — comment out any you lack tokens for
  enabledBaseLayers: [
    'gaode_img',
    'gaode_vec',
    'tianditu_img',
    'tianditu_vec',
    'osm',
    'bing',
    'mapbox',
  ],
});
