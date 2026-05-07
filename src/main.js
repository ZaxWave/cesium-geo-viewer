import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

import { CONFIG } from './config.js';
import { BASE_LAYERS } from './layers/imagery.js';
import { createWorldTerrain, createLocalTerrain } from './layers/terrain.js';
import { createLayerSwitcher } from './ui/layerSwitcher.js';
import { createDataPanel } from './ui/dataPanel.js';

if (CONFIG.cesiumIonToken) {
  Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken;
}

// ---------- Initial base layer (高德影像, no token needed) ----------
const defaultLayer = BASE_LAYERS.gaode_img;
const initialImagery = defaultLayer.factory(CONFIG);

const viewer = new Cesium.Viewer('cesiumContainer', {
  imageryProvider: initialImagery,
  terrainProvider: CONFIG.localTerrainUrl
    ? createLocalTerrain(CONFIG.localTerrainUrl)
    : createWorldTerrain(),
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  infoBox: false,
  selectionIndicator: false,
});

// ---------- UI ----------
const layerSwitcher = createLayerSwitcher(viewer, BASE_LAYERS, 'gaode_img');
const dataPanel = createDataPanel(viewer);

// ---------- Camera ----------
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.38, 39.90, 15000),
});

window.__viewer = viewer;
window.__layerSwitcher = layerSwitcher;
