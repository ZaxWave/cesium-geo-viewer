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

// ---------- Initial base layer ----------
const defaultLayer = BASE_LAYERS.arcgis;
const initialImagery = defaultLayer.factory(CONFIG);

let terrain;
if (CONFIG.localTerrainUrl) {
  terrain = createLocalTerrain(CONFIG.localTerrainUrl);
} else if (CONFIG.cesiumIonToken) {
  terrain = createWorldTerrain();
} else {
  terrain = createDefaultTerrain();
}

const viewer = new Cesium.Viewer('cesiumContainer', {
  imageryProvider: initialImagery,
  terrainProvider: terrain,
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  infoBox: false,
  selectionIndicator: false,
});

// ---------- UI ----------
const layerSwitcher = createLayerSwitcher(viewer, BASE_LAYERS, 'arcgis');
const dataPanel = createDataPanel(viewer);

// ---------- Camera ----------
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.38, 39.90, 15000),
});

window.__viewer = viewer;
window.__layerSwitcher = layerSwitcher;
