import { CONFIG } from '../config.js';
import { load3DTileset, removeTileset } from '../layers/pointcloud.js';
import { loadGeoJsonFromFile, loadKmlFromFile, removeDataSource } from '../layers/vector.js';
import { createWmsLayer } from '../layers/ogc.js';

let items = [];

function addItem(panel, type, name, removeFn) {
  items.push({ type, name, removeFn });
  renderList(panel);
}

function removeItem(panel, index) {
  const item = items[index];
  if (!item) return;
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

  // Body
  const body = document.createElement('div');
  body.className = 'panel-body';

  // ---- Section: Vector ----
  const vecTitle = document.createElement('div');
  vecTitle.className = 'section-title';
  vecTitle.textContent = 'Vector Data';
  body.appendChild(vecTitle);

  const uploadZone = document.createElement('label');
  uploadZone.className = 'upload-zone';
  uploadZone.innerHTML = '<span class="upload-icon">+</span> GeoJSON / KML';

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
      if (ds) addItem(panel, 'Vector', file.name, () => removeDataSource(viewer, ds));
    } catch (e) {
      alert('Load failed: ' + e.message);
    }
    fileInput.value = '';
  });
  uploadZone.appendChild(fileInput);
  body.appendChild(uploadZone);

  // ---- Section: 3D Tiles ----
  const tileTitle = document.createElement('div');
  tileTitle.className = 'section-title';
  tileTitle.textContent = '3D Tiles';
  body.appendChild(tileTitle);

  const tileUrl = document.createElement('input');
  tileUrl.className = 'input-field';
  tileUrl.type = 'text';
  tileUrl.placeholder = 'Tileset URL';
  tileUrl.value = CONFIG.data.building3DTiles;
  body.appendChild(tileUrl);

  const tileBtn = document.createElement('button');
  tileBtn.className = 'btn btn-primary';
  tileBtn.textContent = 'Load';
  tileBtn.addEventListener('click', async () => {
    const url = tileUrl.value.trim();
    if (!url) return;
    try {
      const tileset = await load3DTileset(viewer, url);
      addItem(panel, '3DTiles', url.split('/').pop() || url, () => removeTileset(viewer, tileset));
    } catch (e) {
      alert('Load failed: ' + e.message);
    }
  });
  body.appendChild(tileBtn);

  // ---- Section: WMS ----
  const wmsTitle = document.createElement('div');
  wmsTitle.className = 'section-title';
  wmsTitle.textContent = 'WMS Layer';
  body.appendChild(wmsTitle);

  const wmsUrl = document.createElement('input');
  wmsUrl.className = 'input-field';
  wmsUrl.type = 'text';
  wmsUrl.placeholder = 'WMS URL';
  wmsUrl.value = CONFIG.geoserverUrl + '/ows';
  body.appendChild(wmsUrl);

  const wmsName = document.createElement('input');
  wmsName.className = 'input-field';
  wmsName.type = 'text';
  wmsName.placeholder = 'Layer name (workspace:layer)';
  body.appendChild(wmsName);

  const wmsBtn = document.createElement('button');
  wmsBtn.className = 'btn btn-primary';
  wmsBtn.textContent = 'Load';
  wmsBtn.addEventListener('click', () => {
    const url = wmsUrl.value.trim();
    const layerName = wmsName.value.trim();
    if (!url || !layerName) return;
    try {
      const provider = createWmsLayer(url, layerName);
      const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
      addItem(panel, 'WMS', layerName, () => viewer.imageryLayers.remove(imageryLayer));
    } catch (e) {
      alert('Load failed: ' + e.message);
    }
  });
  body.appendChild(wmsBtn);

  // ---- Section: Loaded Data ----
  const listTitle = document.createElement('div');
  listTitle.className = 'section-title';
  listTitle.textContent = 'Loaded Data';
  body.appendChild(listTitle);

  const listEl = document.createElement('div');
  listEl.className = 'data-list';
  listEl.innerHTML = '<div class="empty">&mdash; No data loaded &mdash;</div>';
  body.appendChild(listEl);

  panel.appendChild(body);
  document.body.appendChild(panel);

  return {
    element: panel,
    destroy() {
      items = [];
      panel.remove();
    },
  };
}
