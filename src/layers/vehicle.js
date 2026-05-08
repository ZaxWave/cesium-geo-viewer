import * as Cesium from 'cesium';

// WHU campus road path [lon, lat, alt] — approximate loop near 信息学部
const WHU_PATH = [
  [114.3500, 30.5315, 2],
  [114.3510, 30.5318, 2],
  [114.3520, 30.5320, 2],
  [114.3525, 30.5325, 2],
  [114.3520, 30.5330, 2],
  [114.3510, 30.5332, 2],
  [114.3500, 30.5330, 2],
  [114.3495, 30.5325, 2],
  [114.3498, 30.5320, 2],
  [114.3500, 30.5315, 2],
];

let activeVehicle = null;

export function startVehicleSimulation(viewer, options = {}) {
  const { path, speed, carUrl } = {
    path: WHU_PATH,
    speed: 20, // m/s
    carUrl: null,
    ...options,
  };

  if (activeVehicle) stopVehicleSimulation(viewer);

  const start = Cesium.JulianDate.fromDate(new Date());
  const totalSeconds = computePathLength(path) / speed;
  const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());

  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = stop.clone();
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 1;

  const position = new Cesium.SampledPositionProperty();
  const step = totalSeconds / (path.length - 1);
  path.forEach(([lon, lat, alt], i) => {
    const time = Cesium.JulianDate.addSeconds(start, step * i, new Cesium.JulianDate());
    position.addSample(time, Cesium.Cartesian3.fromDegrees(lon, lat, alt));
  });

  const orientation = new Cesium.VelocityOrientationProperty(position);

  const entity = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start, stop }),
    ]),
    position,
    orientation,
    model: {
      uri: carUrl || createCarModelUrl(),
      minimumPixelSize: 64,
      scale: 1.5,
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.15,
        color: Cesium.Color.DODGERBLUE,
      }),
      width: 3,
    },
  });

  viewer.trackedEntity = entity;
  viewer.clock.shouldAnimate = true;

  activeVehicle = { entity, start, stop };
  return entity;
}

export function stopVehicleSimulation(viewer) {
  if (activeVehicle) {
    viewer.entities.remove(activeVehicle.entity);
    activeVehicle = null;
  }
  viewer.clock.shouldAnimate = false;
  viewer.trackedEntity = undefined;
}

// Simple car model generated as a colored box with wheels
function createCarModelUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Car body
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(20, 50);
  ctx.lineTo(40, 20);
  ctx.lineTo(180, 20);
  ctx.lineTo(220, 50);
  ctx.lineTo(236, 50);
  ctx.lineTo(236, 90);
  ctx.lineTo(20, 90);
  ctx.closePath();
  ctx.fill();

  // Windows
  ctx.fillStyle = '#a8dadc';
  ctx.fillRect(55, 28, 50, 20);
  ctx.fillRect(115, 28, 50, 20);

  // Wheels
  ctx.fillStyle = '#1d3557';
  ctx.beginPath(); ctx.arc(55, 95, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(195, 95, 14, 0, Math.PI * 2); ctx.fill();

  return canvas.toDataURL();
}

function computePathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [l1, a1] = path[i - 1];
    const [l2, a2] = path[i];
    const dLat = (l2 - l1) * 111320;
    const dLon = (a2 - a1) * 111320 * Math.cos(((a1 + a2) / 2) * Math.PI / 180);
    total += Math.sqrt(dLat * dLat + dLon * dLon);
  }
  return total;
}
