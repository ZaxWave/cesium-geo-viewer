import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

import { CONFIG } from './config.js';
import { BASE_LAYERS } from './layers/imagery.js';
import { createWorldTerrain, createLocalTerrain } from './layers/terrain.js';
import { createLayerSwitcher } from './ui/layerSwitcher.js';
import { createDataPanel } from './ui/dataPanel.js';

// Cesium Ion token
if (CONFIG.cesiumIonToken) {
  Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken;
}

// ---------- Viewer ----------
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: CONFIG.localTerrainUrl
    ? createLocalTerrain(CONFIG.localTerrainUrl)
    : createWorldTerrain(),
  imageryProvider: false,
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  infoBox: false,
  selectionIndicator: false,
});

// ---------- UI ----------
const layerSwitcher = createLayerSwitcher(viewer, BASE_LAYERS);
const dataPanel = createDataPanel(viewer);

// ---------- Camera ----------
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.38, 39.90, 15000),
});

// Expose for console debugging
window.__viewer = viewer;
window.__layerSwitcher = layerSwitcher;
