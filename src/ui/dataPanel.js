import Cesium from 'cesium';
import { CONFIG } from '../config.js';
import { load3DTileset, removeTileset } from '../layers/pointcloud.js';
import { loadGeoJsonFromFile, loadKmlFromFile, removeDataSource, loadCzml, loadCzmlFromFile } from '../layers/vector.js';
import { createWmsLayer, createWmtsLayer, createTmsLayer } from '../layers/ogc.js';
import { loadGeoTiffViaWms } from '../layers/raster.js';
import { createDefaultTerrain, createWorldTerrain, createLocalTerrain } from '../layers/terrain.js';
import { loadGltf, removeGltf } from '../layers/model.js';
import { createSingleImageLayer } from '../layers/singleImage.js';
import { loadBimModel, removeBimModel } from '../layers/bim.js';
import { place3DLogo, remove3DLogo } from '../layers/logo.js';
import { startVehicleSimulation, stopVehicleSimulation, startPicking, stopPicking, clearPath, getPathPointCount, isPicking } from '../layers/vehicle.js';
import { loadRawPointCloud, removeRawPointCloud } from '../layers/pointcloud_raw.js';

const GS = CONFIG.geoserver;

let items = [];

function addItem(panel, type, name, removeFn) {
  items.push({ type, name, removeFn });
  renderList(panel);
}

function removeItem(panel, index) {
  const item = items[index];
  if (!item) return;
  // Reset tracked entity to prevent postRender crash on removed entity
  if (window.__viewer) window.__viewer.trackedEntity = undefined;
  try { item.removeFn(); } catch (e) { console.warn(e); }
  items.splice(index, 1);
  renderList(panel);
}

function renderList(panel) {
  const listEl = panel.querySelector('.data-list');
  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty">&mdash; No data loaded &mdash;</div>';
    return;
  }
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item';
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.textContent = item.type;
    row.appendChild(badge);
    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name;
    name.title = item.name;
    row.appendChild(name);
    const rm = document.createElement('button');
    rm.className = 'btn btn-sm rm-btn';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => removeItem(panel, i));
    row.appendChild(rm);
    listEl.appendChild(row);
  });
}

function makeSection(titleText) {
  const section = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = titleText;
  section.appendChild(title);
  return section;
}

function inputField(placeholder, value) {
  const el = document.createElement('input');
  el.className = 'input-field';
  el.type = 'text';
  el.placeholder = placeholder;
  el.value = value || '';
  return el;
}

function createTabBar(tabs) {
  const bar = document.createElement('div');
  bar.className = 'tab-bar';
  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.dataset.tab = i;
    btn.addEventListener('click', () => switchTab(bar, i));
    bar.appendChild(btn);
  });
  return bar;
}

function switchTab(bar, idx) {
  bar.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  bar.children[idx].classList.add('active');
  const panels = bar.parentElement.querySelectorAll('.tab-panel');
  panels.forEach((p) => p.style.display = 'none');
  panels[idx].style.display = '';
}

// ---------- Public ----------
export function createDataPanel(viewer) {
  const panel = document.createElement('div');
  panel.className = 'data-panel glass-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';
  const dot = document.createElement('span');
  dot.className = 'dot';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Data';
  header.appendChild(dot);
  header.appendChild(label);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'panel-body';

  // ---- Tab bar ----
  body.appendChild(createTabBar([
    { label: '影像' },
    { label: '模型' },
    { label: '其他' },
  ]));

  // ==================== TAB 0: 影像 ====================
  const tab0 = document.createElement('div');
  tab0.className = 'tab-panel';

  // WMS
  const wmsSec = makeSection('WMS');
  const wmsUrl = inputField('WMS URL', GS.wmsUrl);
  const wmsLayerName = inputField('Layer name', GS.wmsLayer);
  [wmsUrl, wmsLayerName].forEach(el => wmsSec.appendChild(el));
  const wmsBtn = document.createElement('button');
  wmsBtn.className = 'btn btn-primary';
  wmsBtn.textContent = 'Load';
  wmsBtn.addEventListener('click', () => {
    const url = wmsUrl.value.trim(), ln = wmsLayerName.value.trim();
    if (!url || !ln) return;
    try {
      const p = createWmsLayer(url, ln);
      const l = viewer.imageryLayers.addImageryProvider(p);
      addItem(panel, 'WMS', ln, () => viewer.imageryLayers.remove(l));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  wmsSec.appendChild(wmsBtn);
  tab0.appendChild(wmsSec);

  // WMTS
  const wmtsSec = makeSection('WMTS');
  const wmtsUrl = inputField('WMTS URL', GS.wmtsUrl);
  const wmtsLayerName = inputField('Layer name', GS.wmtsLayer);
  [wmtsUrl, wmtsLayerName].forEach(el => wmtsSec.appendChild(el));
  const wmtsBtn = document.createElement('button');
  wmtsBtn.className = 'btn btn-primary';
  wmtsBtn.textContent = 'Load';
  wmtsBtn.addEventListener('click', () => {
    const url = wmtsUrl.value.trim(), ln = wmtsLayerName.value.trim();
    if (!url || !ln) return;
    try {
      const p = createWmtsLayer(url, ln);
      const l = viewer.imageryLayers.addImageryProvider(p);
      addItem(panel, 'WMTS', ln, () => viewer.imageryLayers.remove(l));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  wmtsSec.appendChild(wmtsBtn);
  tab0.appendChild(wmtsSec);

  // TMS
  const tmsSec = makeSection('TMS');
  const tmsUrl = inputField('TMS URL', GS.tmsUrl);
  const tmsPath = inputField('Full path', GS.tmsPath);
  [tmsUrl, tmsPath].forEach(el => tmsSec.appendChild(el));
  const tmsBtn = document.createElement('button');
  tmsBtn.className = 'btn btn-primary';
  tmsBtn.textContent = 'Load';
  tmsBtn.addEventListener('click', () => {
    const url = (tmsUrl.value.trim() + tmsPath.value.trim()).replace(/\/$/, '');
    if (!url) return;
    try {
      const p = createTmsLayer(url);
      const l = viewer.imageryLayers.addImageryProvider(p);
      addItem(panel, 'TMS', url.split('/').pop(), () => viewer.imageryLayers.remove(l));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  tmsSec.appendChild(tmsBtn);
  tab0.appendChild(tmsSec);

  // WHU DOM — orthophoto TMS tiles
  const whuDomSec = makeSection('WHU DOM (Orthophoto)');
  const whuDomBtn = document.createElement('button');
  whuDomBtn.className = 'btn btn-primary';
  whuDomBtn.textContent = 'Load WHU Orthophoto';
  whuDomBtn.addEventListener('click', () => {
    try {
      const provider = new Cesium.TileMapServiceImageryProvider({
        url: CONFIG.whuDomUrl,
        credit: 'WHU DOM',
      });
      const l = viewer.imageryLayers.addImageryProvider(provider);
      addItem(panel, 'DOM', 'WHU Orthophoto', () => viewer.imageryLayers.remove(l));
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          CONFIG.whuCenter[0], CONFIG.whuCenter[1], 1200
        ),
      });
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  whuDomSec.appendChild(whuDomBtn);
  tab0.appendChild(whuDomSec);

  // Single Image
  const imgSec = makeSection('Single Image');
  const imgUrl = inputField('Image URL', CONFIG.data.singleImage || '');
  imgSec.appendChild(imgUrl);
  const imgBtn = document.createElement('button');
  imgBtn.className = 'btn btn-primary';
  imgBtn.textContent = 'Load as Layer';
  imgBtn.addEventListener('click', () => {
    const url = imgUrl.value.trim();
    if (!url) return;
    try {
      const provider = createSingleImageLayer(url);
      const l = viewer.imageryLayers.addImageryProvider(provider);
      addItem(panel, 'Image', url.split('/').pop() || url, () => viewer.imageryLayers.remove(l));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  imgSec.appendChild(imgBtn);
  tab0.appendChild(imgSec);

  // TIFF
  const tiffSec = makeSection('TIFF (via WMS)');
  const tiffLayerName = inputField('Layer name', GS.tiffLayer);
  tiffSec.appendChild(tiffLayerName);
  const tiffBtn = document.createElement('button');
  tiffBtn.className = 'btn btn-primary';
  tiffBtn.textContent = 'Load';
  tiffBtn.addEventListener('click', () => {
    const ln = tiffLayerName.value.trim();
    if (!ln) return;
    try {
      const l = loadGeoTiffViaWms(viewer, ln);
      addItem(panel, 'TIFF', ln, () => viewer.imageryLayers.remove(l));
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(...GS.hubeiCenter) });
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  tiffSec.appendChild(tiffBtn);
  tab0.appendChild(tiffSec);

  // ==================== TAB 1: 模型 ====================
  const tab1 = document.createElement('div');
  tab1.className = 'tab-panel';
  tab1.style.display = 'none';

  // 3D Tiles
  const tileSec = makeSection('3D Tiles');
  const tileUrl = inputField('Tileset URL', CONFIG.data.building3DTiles);
  tileSec.appendChild(tileUrl);
  const tileBtn = document.createElement('button');
  tileBtn.className = 'btn btn-primary';
  tileBtn.textContent = 'Load';
  tileBtn.addEventListener('click', async () => {
    const url = tileUrl.value.trim();
    if (!url) return;
    const chip = document.querySelector('.layer-chip[data-layer-id="tianditu_img"]');
    if (chip) chip.click();
    try {
      const tileset = await load3DTileset(viewer, url);
      addItem(panel, '3DTiles', url.split('/').pop() || url, () => removeTileset(viewer, tileset));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  tileSec.appendChild(tileBtn);
  tab1.appendChild(tileSec);

  // WHU Oblique
  const whuSec = makeSection('WHU Oblique');
  const whuUrl = inputField('Tileset URL', CONFIG.data.whuOblique);
  whuSec.appendChild(whuUrl);
  const whuBtn = document.createElement('button');
  whuBtn.className = 'btn btn-primary';
  whuBtn.textContent = 'Load WHU';
  whuBtn.addEventListener('click', async () => {
    const url = whuUrl.value.trim();
    if (!url) return;
    const chip = document.querySelector('.layer-chip[data-layer-id="tianditu_img"]');
    if (chip) chip.click();
    try {
      const tileset = await load3DTileset(viewer, url);
      addItem(panel, '3DTiles', 'WHU Oblique', () => removeTileset(viewer, tileset));
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CONFIG.whuCenter[0], CONFIG.whuCenter[1], 500),
        orientation: { heading: Cesium.Math.toRadians(30), pitch: Cesium.Math.toRadians(-30), roll: 0 },
      });
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  whuSec.appendChild(whuBtn);
  tab1.appendChild(whuSec);

  // glTF
  const gltfSec = makeSection('glTF Model');
  const gltfUrl = inputField('glTF / GLB URL or path', CONFIG.data.gltf || '');
  gltfSec.appendChild(gltfUrl);
  const gltfUpload = document.createElement('label');
  gltfUpload.className = 'upload-zone';
  gltfUpload.innerHTML = '<span class="upload-icon">+</span>Upload .gltf / .glb';
  const gltfFileInput = document.createElement('input');
  gltfFileInput.type = 'file';
  gltfFileInput.accept = '.gltf,.glb';
  gltfFileInput.addEventListener('change', async () => {
    const file = gltfFileInput.files[0];
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const model = await loadGltf(viewer, url);
      addItem(panel, 'glTF', file.name, () => removeGltf(viewer, model));
    } catch (e) { alert('Load failed: ' + e.message); }
    gltfFileInput.value = '';
  });
  gltfUpload.appendChild(gltfFileInput);
  gltfSec.appendChild(gltfUpload);
  const gltfBtn = document.createElement('button');
  gltfBtn.className = 'btn btn-primary';
  gltfBtn.textContent = 'Load from URL';
  gltfBtn.addEventListener('click', async () => {
    const url = gltfUrl.value.trim();
    if (!url) return;
    try {
      const model = await loadGltf(viewer, url);
      addItem(panel, 'glTF', url.split('/').pop() || url, () => removeGltf(viewer, model));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  gltfSec.appendChild(gltfBtn);
  tab1.appendChild(gltfSec);

  // BIM
  const bimSec = makeSection('BIM Model');
  const bimSelect = document.createElement('select');
  bimSelect.className = 'input-field';
  const bimPresets = [
    { label: 'IfcOpenHouse (小别墅)', path: '/data/Models/IfcOpenHouse/IfcOpenHouse.gltf' },
    { label: 'rac_basic_sample_project (办公楼)', path: '/data/Models/rac_basic_sample_project/rac_basic_sample_project.gltf' },
  ];
  bimPresets.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.path;
    opt.textContent = p.label;
    bimSelect.appendChild(opt);
  });
  bimSec.appendChild(bimSelect);
  const bimBtnRow = document.createElement('div');
  bimBtnRow.style.cssText = 'display:flex;gap:4px;margin-top:4px;';
  const bimLoadBtn = document.createElement('button');
  bimLoadBtn.className = 'btn btn-primary';
  bimLoadBtn.textContent = 'Load BIM';
  bimLoadBtn.addEventListener('click', async () => {
    const url = bimSelect.value;
    if (!url) return;
    try {
      const model = await loadBimModel(viewer, url);
      addItem(panel, 'BIM', url.split('/').pop() || url, () => removeBimModel(viewer, model));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  bimBtnRow.appendChild(bimLoadBtn);
  const bimDemoBtn = document.createElement('button');
  bimDemoBtn.className = 'btn btn-sm';
  bimDemoBtn.textContent = 'Demo';
  bimDemoBtn.style.cssText = 'background:#2a9d8f;color:#fff;padding:5px 12px;font-size:10px;';
  bimDemoBtn.addEventListener('click', async () => {
    try {
      const model = await loadBimModel(viewer, '');
      addItem(panel, 'BIM', 'Demo Building', () => removeBimModel(viewer, model));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  bimBtnRow.appendChild(bimDemoBtn);
  bimSec.appendChild(bimBtnRow);
  tab1.appendChild(bimSec);

  // Point Cloud
  const pcSec = makeSection('Point Cloud');
  const pcSelect = document.createElement('select');
  pcSelect.className = 'input-field';
  const pcFiles = [
    { label: 'Chair (TXT)', path: '/data/三维点云数据/Chair.txt' },
    { label: 'Skull (TXT)', path: '/data/三维点云数据/Skull.txt' },
  ];
  pcFiles.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.path;
    opt.textContent = f.label;
    pcSelect.appendChild(opt);
  });
  pcSec.appendChild(pcSelect);
  const pcBtn = document.createElement('button');
  pcBtn.className = 'btn btn-primary';
  pcBtn.textContent = 'Load Point Cloud';
  pcBtn.addEventListener('click', async () => {
    try {
      const pc = await loadRawPointCloud(viewer, pcSelect.value);
      addItem(panel, 'PtCloud', pcSelect.value.split('/').pop(), () => removeRawPointCloud(viewer, pc));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  pcSec.appendChild(pcBtn);
  tab1.appendChild(pcSec);

  // CZML
  const czmlSec = makeSection('CZML');
  const czmlUrl = inputField('CZML URL', CONFIG.data.czml || '');
  czmlSec.appendChild(czmlUrl);
  const czmlUpload = document.createElement('label');
  czmlUpload.className = 'upload-zone';
  czmlUpload.innerHTML = '<span class="upload-icon">+</span>Upload .czml';
  const czmlFileInput = document.createElement('input');
  czmlFileInput.type = 'file';
  czmlFileInput.accept = '.czml';
  czmlFileInput.addEventListener('change', async () => {
    const file = czmlFileInput.files[0];
    if (!file) return;
    try {
      const ds = await loadCzmlFromFile(viewer, file);
      if (ds) addItem(panel, 'CZML', file.name, () => removeDataSource(viewer, ds));
    } catch (e) { alert('Load failed: ' + e.message); }
    czmlFileInput.value = '';
  });
  czmlUpload.appendChild(czmlFileInput);
  czmlSec.appendChild(czmlUpload);
  const czmlBtn = document.createElement('button');
  czmlBtn.className = 'btn btn-primary';
  czmlBtn.textContent = 'Load from URL';
  czmlBtn.addEventListener('click', async () => {
    const url = czmlUrl.value.trim();
    if (!url) return;
    try {
      const ds = await loadCzml(viewer, url);
      if (ds) addItem(panel, 'CZML', url.split('/').pop() || url, () => removeDataSource(viewer, ds));
    } catch (e) { alert('Load failed: ' + e.message); }
  });
  czmlSec.appendChild(czmlBtn);
  tab1.appendChild(czmlSec);

  // ==================== TAB 2: 其他 ====================
  const tab2 = document.createElement('div');
  tab2.className = 'tab-panel';
  tab2.style.display = 'none';

  // Vector
  const vecSec = makeSection('Vector Data');
  const uploadZone = document.createElement('label');
  uploadZone.className = 'upload-zone';
  uploadZone.innerHTML = '<span class="upload-icon">+</span>GeoJSON / KML';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.geojson,.json,.kml,.kmz';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let ds;
      if (ext === 'kml' || ext === 'kmz') ds = await loadKmlFromFile(viewer, file);
      else ds = await loadGeoJsonFromFile(viewer, file);
      if (ds) addItem(panel, 'Vector', file.name, () => removeDataSource(viewer, ds));
    } catch (e) { alert('Load failed: ' + e.message); }
    fileInput.value = '';
  });
  uploadZone.appendChild(fileInput);
  vecSec.appendChild(uploadZone);
  tab2.appendChild(vecSec);

  // 3D LOGO
  const logoSec = makeSection('3D LOGO');
  const logoInput = inputField('Your Name', CONFIG.data.logoName || '');
  logoSec.appendChild(logoInput);
  const logoBtn = document.createElement('button');
  logoBtn.className = 'btn btn-primary';
  logoBtn.textContent = 'Place LOGO at WHU';
  logoBtn.addEventListener('click', () => {
    const name = logoInput.value.trim() || '未命名';
    try {
      const pos = CONFIG.logoPosition;
      const entity = place3DLogo(viewer, name,
        pos ? { lon: pos[0], lat: pos[1], alt: pos[2] } : {});
      addItem(panel, 'LOGO', name, () => remove3DLogo(viewer, entity));
    } catch (e) { alert('Place LOGO failed: ' + e.message); }
  });
  logoSec.appendChild(logoBtn);
  tab2.appendChild(logoSec);

  // Vehicle
  const vehSec = makeSection('Vehicle Sim');
  const vehStatus = document.createElement('div');
  vehStatus.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:4px;';
  vehStatus.textContent = 'Pick points on map, then Start';

  const vehRow1 = document.createElement('div');
  vehRow1.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;';
  const vehRow2 = document.createElement('div');
  vehRow2.style.cssText = 'display:flex;gap:4px;';

  function vehBtn(label, color, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.textContent = label;
    btn.style.cssText = `flex:1;padding:5px 8px;font-size:10px;background:${color};color:#fff;`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  // Pick path toggle
  let pickBtn = vehBtn('Pick Path', '#5b9bd5', () => {
    if (isPicking()) {
      stopPicking();
      pickBtn.textContent = 'Pick Path';
      pickBtn.style.background = '#5b9bd5';
      vehStatus.textContent = `${getPathPointCount()} points picked`;
    } else {
      startPicking(viewer, (count) => {
        vehStatus.textContent = `${count} point${count > 1 ? 's' : ''} picked — click more or Start`;
      });
      pickBtn.textContent = 'Stop Pick';
      pickBtn.style.background = '#e76f51';
      vehStatus.textContent = 'Click on map to place points...';
    }
  });
  vehRow1.appendChild(pickBtn);
  vehRow1.appendChild(vehBtn('Clear', '#6c757d', () => {
    clearPath(viewer);
    vehStatus.textContent = 'Path cleared. Pick points on map.';
  }));
  vehRow2.appendChild(vehBtn('Start', '#2a9d8f', () => {
    try {
      const car = startVehicleSimulation(viewer);
      if (car) {
        stopPicking();
        pickBtn.textContent = 'Pick Path';
        pickBtn.style.background = '#5b9bd5';
        addItem(panel, 'Vehicle', 'Car', () => stopVehicleSimulation(viewer));
      }
    } catch (e) { alert('Sim failed: ' + e.message); }
  }));
  vehRow2.appendChild(vehBtn('Stop', '#e76f51', () => {
    stopVehicleSimulation(viewer);
    vehStatus.textContent = 'Stopped. Pick new path or Start again.';
    items = items.filter((item) => item.type !== 'Vehicle');
    renderList(panel);
  }));

  vehSec.appendChild(vehStatus);
  vehSec.appendChild(vehRow1);
  vehSec.appendChild(vehRow2);
  tab2.appendChild(vehSec);

  // Terrain
  const terrainSec = makeSection('Terrain');
  const terrainStatus = document.createElement('div');
  terrainStatus.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:6px;';
  terrainStatus.textContent = 'Flat (ellipsoid)';
  terrainSec.appendChild(terrainStatus);
  const terrainRow = document.createElement('div');
  terrainRow.style.cssText = 'display:flex;gap:4px;';
  function terrainBtn(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.textContent = label;
    btn.style.cssText = 'flex:1;padding:5px 8px;font-size:10px;';
    btn.addEventListener('click', onClick);
    return btn;
  }
  terrainRow.appendChild(terrainBtn('Flat', () => {
    viewer.terrainProvider = createDefaultTerrain();
    terrainStatus.textContent = 'Flat (ellipsoid)';
  }));
  if (CONFIG.cesiumIonToken) {
    terrainRow.appendChild(terrainBtn('Online', async () => {
      terrainStatus.textContent = 'Loading...';
      try {
        const wt = await Cesium.createWorldTerrainAsync();
        viewer.terrainProvider = wt;
        terrainStatus.textContent = 'Cesium World Terrain';
      } catch (e) {
        terrainStatus.textContent = 'Failed: ' + e.message;
        viewer.terrainProvider = createDefaultTerrain();
      }
    }));
  }
  if (CONFIG.localTerrainUrl) {
    terrainRow.appendChild(terrainBtn('Local', async () => {
      terrainStatus.textContent = 'Loading Local...';
      try {
        viewer.terrainProvider = await createLocalTerrain(CONFIG.localTerrainUrl);
        terrainStatus.textContent = 'Local Terrain (WHU)';
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            CONFIG.whuCenter[0], CONFIG.whuCenter[1], 2000
          ),
        });
      } catch (e) {
        terrainStatus.textContent = 'Failed: ' + e.message;
        viewer.terrainProvider = createDefaultTerrain();
      }
    }));
  }
  terrainSec.appendChild(terrainRow);
  tab2.appendChild(terrainSec);

  // Append all tab panels
  body.appendChild(tab0);
  body.appendChild(tab1);
  body.appendChild(tab2);

  // ---- Loaded list (always visible) ----
  const listSec = makeSection('已加载');
  const listEl = document.createElement('div');
  listEl.className = 'data-list';
  listEl.innerHTML = '<div class="empty">&mdash; No data loaded &mdash;</div>';
  listSec.appendChild(listEl);
  body.appendChild(listSec);

  panel.appendChild(body);
  document.body.appendChild(panel);

  return {
    element: panel,
    bodyEl: body,
    destroy() { items = []; panel.remove(); },
  };
}
