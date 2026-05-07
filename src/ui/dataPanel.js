import { CONFIG } from '../config.js';
import { load3DTileset, removeTileset } from '../layers/pointcloud.js';
import { loadGeoJsonFromFile, loadKmlFromFile, removeDataSource } from '../layers/vector.js';
import { createWmsLayer } from '../layers/ogc.js';

let items = [];

function addItem(panel, viewer, type, name, removeFn) {
  const item = { type, name, removeFn };
  items.push(item);
  renderItemList(panel, viewer);
}

function removeItem(panel, viewer, index) {
  const item = items[index];
  if (!item) return;
  try {
    item.removeFn();
  } catch (e) {
    console.warn('Remove failed:', e);
  }
  items.splice(index, 1);
  renderItemList(panel, viewer);
}

function renderItemList(panel, viewer) {
  const listEl = panel.querySelector('.data-item-list');
  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.textContent = '暂无数据';
    return;
  }
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'layer-item';

    const label = document.createElement('span');
    label.textContent = `[${item.type}] ${item.name}`;
    label.title = item.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '移除';
    removeBtn.addEventListener('click', () => removeItem(panel, viewer, i));

    row.appendChild(label);
    row.appendChild(removeBtn);
    listEl.appendChild(row);
  });
}

// ---------- Public ----------
export function createDataPanel(viewer) {
  const panel = document.createElement('div');
  panel.className = 'cesium-data-panel';

  // --- Title ---
  const title = document.createElement('h3');
  title.textContent = '数据加载';
  panel.appendChild(title);

  // --- Vector section ---
  const vecSection = document.createElement('section');
  vecSection.innerHTML = '<h4>矢量数据 (GeoJSON / KML)</h4>';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.geojson,.json,.kml,.kmz';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      let ds;
      if (ext === 'kml' || ext === 'kmz') {
        ds = await loadKmlFromFile(viewer, file);
      } else {
        ds = await loadGeoJsonFromFile(viewer, file);
      }
      if (ds) {
        addItem(panel, viewer, '矢量', file.name, () => removeDataSource(viewer, ds));
      }
    } catch (e) {
      alert('加载失败: ' + e.message);
    }
    fileInput.value = '';
  });
  vecSection.appendChild(fileInput);
  panel.appendChild(vecSection);

  // --- 3D Tiles section ---
  const tilesSection = document.createElement('section');
  tilesSection.innerHTML = '<h4>3D Tiles</h4>';

  const tilesUrl = document.createElement('input');
  tilesUrl.type = 'text';
  tilesUrl.placeholder = 'tileset.json URL';
  tilesUrl.value = CONFIG.data.building3DTiles;
  tilesSection.appendChild(tilesUrl);

  const tilesBtn = document.createElement('button');
  tilesBtn.textContent = '加载';
  tilesBtn.addEventListener('click', async () => {
    const url = tilesUrl.value.trim();
    if (!url) return;
    try {
      const tileset = await load3DTileset(viewer, url);
      addItem(panel, viewer, '3DTiles', url, () => removeTileset(viewer, tileset));
    } catch (e) {
      alert('加载失败: ' + e.message);
    }
  });
  tilesSection.appendChild(tilesBtn);
  panel.appendChild(tilesSection);

  // --- WMS section ---
  const wmsSection = document.createElement('section');
  wmsSection.innerHTML = '<h4>WMS 图层</h4>';

  const wmsUrl = document.createElement('input');
  wmsUrl.type = 'text';
  wmsUrl.placeholder = 'WMS URL (e.g. geoserver/ows)';
  wmsUrl.value = CONFIG.geoserverUrl + '/ows';
  wmsSection.appendChild(wmsUrl);

  const wmsLayer = document.createElement('input');
  wmsLayer.type = 'text';
  wmsLayer.placeholder = '图层名称 (e.g. workspace:layer)';
  wmsSection.appendChild(wmsLayer);

  const wmsBtn = document.createElement('button');
  wmsBtn.textContent = '加载';
  wmsBtn.addEventListener('click', () => {
    const url = wmsUrl.value.trim();
    const layerName = wmsLayer.value.trim();
    if (!url || !layerName) return;
    try {
      const provider = createWmsLayer(url, layerName);
      const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
      addItem(panel, viewer, 'WMS', layerName, () => viewer.imageryLayers.remove(imageryLayer));
    } catch (e) {
      alert('加载失败: ' + e.message);
    }
  });
  wmsSection.appendChild(wmsBtn);
  panel.appendChild(wmsSection);

  // --- Loaded items ---
  const listSection = document.createElement('section');
  listSection.innerHTML = '<h4>已加载数据</h4>';
  const listEl = document.createElement('div');
  listEl.className = 'data-item-list';
  listEl.textContent = '暂无数据';
  listSection.appendChild(listEl);
  panel.appendChild(listSection);

  document.body.appendChild(panel);

  return {
    element: panel,
    destroy() {
      items = [];
      panel.remove();
    },
  };
}
