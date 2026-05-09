import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

import { CONFIG } from './config.js';
import { BASE_LAYERS } from './layers/imagery.js';
import { createDefaultTerrain, createWorldTerrain, createLocalTerrain } from './layers/terrain.js';
import { createLayerSwitcher } from './ui/layerSwitcher.js';
import { createDataPanel } from './ui/dataPanel.js';

// 1. 设置 Token [cite: 16, 91, 92]
if (CONFIG.cesiumIonToken) {
  Cesium.Ion.defaultAccessToken = CONFIG.cesiumIonToken;
}

// 2. 初始化 Viewer
// 注意：在新版中完全禁用 baseLayerPicker，并使用简单的 EllipsoidTerrainProvider 初始化 [cite: 102, 103]
const viewer = new Cesium.Viewer('cesiumContainer', {
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  infoBox: false,
  selectionIndicator: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  shadows: true,
});

const scController = viewer.scene.screenSpaceCameraController;
scController.enableRotate = true;
scController.enableTranslate = true;
scController.enableZoom = true;
scController.enableTilt = true;
scController.enableLook = true;
scController.minimumZoomDistance = 1;
scController.maximumZoomDistance = 50000000;
scController.minimumPitch = Cesium.Math.toRadians(-89);
scController.maximumPitch = Cesium.Math.toRadians(-1);

// Camera help overlay
(function setupCameraHelp() {
  const el = document.createElement('div');
  el.className = 'camera-help';
  el.innerHTML = '左键拖拽旋转 &nbsp;|&nbsp; 右键拖拽平移 &nbsp;|&nbsp; 滚轮缩放 &nbsp;|&nbsp; 中键/Ctrl+左键 倾斜';
  document.body.appendChild(el);
})();

/**
 * 初始化场景：处理底图和地形的异步加载 [cite: 51, 52, 104, 105]
 */
async function initializeScene() {
  try {
    // 强制清空 Cesium 默认加载的影像图层
    viewer.imageryLayers.removeAll();

    // 加载默认底图 (OSM)
    const defaultLayer = BASE_LAYERS.osm;
    const imageryProvider = defaultLayer.factory(CONFIG);
    viewer.imageryLayers.addImageryProvider(imageryProvider);

    // 默认平面地形 — 倾斜模型/点云需要时保持平面，地形由用户手动开启
    viewer.terrainProvider = createDefaultTerrain();

    console.log("场景初始化完成 (平面地形)");
  } catch (error) {
    console.error("场景初始化失败:", error);
    if (viewer.imageryLayers.length === 0) {
      viewer.imageryLayers.addImageryProvider(BASE_LAYERS.osm.factory(CONFIG));
    }
  }
}

// 执行初始化
initializeScene();

// 3. UI 挂载
const layerSwitcher = createLayerSwitcher(viewer, BASE_LAYERS, 'osm');
const dataPanel = createDataPanel(viewer);

// 4. 设置初始视角：武大信息学部
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(
    CONFIG.whuCenter[0], CONFIG.whuCenter[1], 2000
  ),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0
  },
});

// 暴露到全局方便调试 [cite: 94]
window.__viewer = viewer;
window.__layerSwitcher = layerSwitcher;

// 5. 鼠标坐标追踪 — 显示在右下角
(function setupCoordinateTracker() {
  const div = document.createElement('div');
  div.className = 'coord-tracker';
  div.innerHTML = 'Lon: --- &nbsp; Lat: ---';
  document.body.appendChild(div);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const cartesian = viewer.scene.pickPosition(movement.endPosition);
    if (Cesium.defined(cartesian)) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
      const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
      div.innerHTML = `Lon: ${lon} &nbsp;&nbsp; Lat: ${lat}`;
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
})();