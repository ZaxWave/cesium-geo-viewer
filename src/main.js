import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

import { CONFIG } from './config.js';
import { BASE_LAYERS } from './layers/imagery.js';
import { createDefaultTerrain, createWorldTerrain, createLocalTerrain } from './layers/terrain.js';
import { createLayerSwitcher } from './ui/layerSwitcher.js';
import { createDataPanel } from './ui/dataPanel.js';

if (CONFIG.cesiumIonToken) {
  Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken;
}

// ---------- Viewer (no imageryProvider/terrainProvider — removed in 1.117+) ----------
const viewer = new Cesium.Viewer('cesiumContainer', {
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  infoBox: false,
  selectionIndicator: false,
});

// ---------- Add initial imagery & terrain AFTER viewer creation ----------
const defaultLayer = BASE_LAYERS.gaode_img;
viewer.imageryLayers.addImageryProvider(defaultLayer.factory(CONFIG));

if (CONFIG.localTerrainUrl) {
  viewer.terrainProvider = createLocalTerrain(CONFIG.localTerrainUrl);
} else if (CONFIG.cesiumIonToken) {
  viewer.terrainProvider = createWorldTerrain();
} else {
  viewer.terrainProvider = createDefaultTerrain();
}

// ---------- UI ----------
const layerSwitcher = createLayerSwitcher(viewer, BASE_LAYERS, 'gaode_img');
const dataPanel = createDataPanel(viewer);

// ---------- Camera ----------
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.38, 39.90, 15000),
});

window.__viewer = viewer;
window.__layerSwitcher = layerSwitcher;
