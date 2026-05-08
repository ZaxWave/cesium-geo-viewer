import * as Cesium from 'cesium';

// Parse raw point cloud files and render as Cesium point primitives
export async function loadRawPointCloud(viewer, url, options = {}) {
  const { color, pixelSize, maxPoints } = {
    color: Cesium.Color.DODGERBLUE,
    pixelSize: 3,
    maxPoints: 500000,
    ...options,
  };

  const ext = url.split('.').pop().toLowerCase();
  const response = await fetch(url);
  const text = await response.text();

  let points = [];

  switch (ext) {
    case 'ply':
      points = parsePly(text);
      break;
    case 'pcd':
      points = parsePcd(text);
      break;
    case 'txt':
      points = parseTxt(text);
      break;
    case 'obj':
      points = parseObj(text);
      break;
    default:
      throw new Error(`Unsupported point cloud format: .${ext}`);
  }

  if (points.length === 0) throw new Error('No points found in file');

  // Downsample if needed
  if (points.length > maxPoints) {
    const step = Math.floor(points.length / maxPoints);
    points = points.filter((_, i) => i % step === 0);
    console.log(`Downsampled point cloud from ${points.length * step} to ${points.length} points`);
  }

  // Compute center for positioning
  let cx = 0, cy = 0, cz = 0;
  points.forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; });
  cx /= points.length; cy /= points.length; cz /= points.length;

  // Create point primitives
  const scene = viewer.scene;
  const collection = new Cesium.PointPrimitiveCollection();

  points.forEach(([x, y, z]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    const lon = 114.35 + (x - cx) * 0.00001;
    const lat = 30.53 + (y - cy) * 0.00001;
    const alt = (z - cz) * 0.01 + 100;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(alt)) return;
    collection.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      color,
      pixelSize,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
  });

  scene.primitives.add(collection);
  const targetCenter = Cesium.Cartesian3.fromDegrees(114.35, 30.53, 100);
  viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(targetCenter, 800));
  return collection;
}

export function removeRawPointCloud(viewer, collection) {
  viewer.scene.primitives.remove(collection);
}

// ---- Parsers ----

function parsePly(text) {
  const points = [];
  const lines = text.split('\n');
  let inHeader = true;
  let vertCount = 0;

  for (const line of lines) {
    if (inHeader) {
      const m = line.match(/^element vertex (\d+)/);
      if (m) vertCount = parseInt(m[1]);
      if (line.startsWith('end_header')) { inHeader = false; }
      continue;
    }
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      if (!isNaN(x)) points.push([x, y, z]);
    }
  }
  return points;
}

function parsePcd(text) {
  const points = [];
  const lines = text.split('\n');
  let inData = false;
  let fields = [];

  for (const line of lines) {
    if (line.startsWith('FIELDS')) {
      fields = line.replace('FIELDS', '').trim().split(/\s+/);
    }
    if (line.startsWith('DATA')) {
      inData = true;
      continue;
    }
    if (!inData) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      const xi = fields.indexOf('x');
      const yi = fields.indexOf('y');
      const zi = fields.indexOf('z');
      if (xi >= 0 && yi >= 0 && zi >= 0) {
        const x = parseFloat(parts[xi]);
        const y = parseFloat(parts[yi]);
        const z = parseFloat(parts[zi]);
        if (!isNaN(x)) points.push([x, y, z]);
      }
    }
  }
  return points;
}

function parseTxt(text) {
  const points = [];
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      if (!isNaN(x)) points.push([x, y, z]);
    }
  }
  return points;
}

function parseObj(text) {
  const points = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x)) points.push([x, y, z]);
      }
    }
  }
  return points;
}
