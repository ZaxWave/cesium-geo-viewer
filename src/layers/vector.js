import Cesium from 'cesium';

const DEFAULT_STYLE = {
  stroke: Cesium.Color.fromCssColorString('#FFD700'),
  fill: Cesium.Color.fromCssColorString('#FFD700').withAlpha(0.3),
  strokeWidth: 2,
  clampToGround: true,
};

export async function loadGeoJson(viewer, url, options = {}) {
  const dataSource = await Cesium.GeoJsonDataSource.load(url, {
    ...DEFAULT_STYLE,
    ...options,
  });
  viewer.dataSources.add(dataSource);
  await viewer.zoomTo(dataSource);
  return dataSource;
}

export async function loadGeoJsonFromFile(viewer, file, options) {
  const url = URL.createObjectURL(file);
  try {
    return await loadGeoJson(viewer, url, options);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadKml(viewer, url, options = {}) {
  const dataSource = await Cesium.KmlDataSource.load(url, {
    camera: viewer.scene.camera,
    canvas: viewer.scene.canvas,
    clampToGround: true,
    ...options,
  });
  viewer.dataSources.add(dataSource);
  await viewer.zoomTo(dataSource);
  return dataSource;
}

export async function loadKmlFromFile(viewer, file, options) {
  const url = URL.createObjectURL(file);
  try {
    return await loadKml(viewer, url, options);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function removeDataSource(viewer, dataSource) {
  viewer.dataSources.remove(dataSource, true);
}

// ---------- CZML ----------
const DEFAULT_CZML_STYLE = {
  stroke: Cesium.Color.fromCssColorString('#FFD700'),
  fill: Cesium.Color.fromCssColorString('#FFD700').withAlpha(0.3),
  strokeWidth: 2,
};

export async function loadCzml(viewer, url, options = {}) {
  const dataSource = await Cesium.CzmlDataSource.load(url, {
    ...DEFAULT_CZML_STYLE,
    ...options,
  });
  viewer.dataSources.add(dataSource);
  await viewer.zoomTo(dataSource);
  return dataSource;
}

export async function loadCzmlFromFile(viewer, file, options) {
  const url = URL.createObjectURL(file);
  try {
    return await loadCzml(viewer, url, options);
  } finally {
    URL.revokeObjectURL(url);
  }
}
