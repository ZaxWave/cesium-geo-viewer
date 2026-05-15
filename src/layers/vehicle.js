import Cesium from 'cesium';

// --- State ---
let pathPoints = [];
let pathMarkers = [];
let pickHandler = null;
let pickingActive = false;
let onPathUpdate = null;
let activeVehicle = null;

// ==================== Path Picking ====================

export function startPicking(viewer, onUpdate) {
  if (pickingActive) return;
  pickingActive = true;
  onPathUpdate = onUpdate || null;

  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );

  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  pickHandler.setInputAction((click) => {
    const cartesian = viewer.scene.pickPosition(click.position);
    if (!Cesium.defined(cartesian)) return;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const alt = cartographic.height > 0 ? cartographic.height : 3;

    pathPoints.push({ lon, lat, alt });

    const marker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      point: {
        pixelSize: 10,
        color: Cesium.Color.DODGERBLUE,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: String(pathPoints.length),
        font: 'bold 11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    pathMarkers.push(marker);
    updatePathLine(viewer);

    if (onPathUpdate) onPathUpdate(pathPoints.length);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function updatePathLine(viewer) {
  if (pathMarkers._line) { viewer.entities.remove(pathMarkers._line); pathMarkers._line = null; }
  if (pathPoints.length < 2) return;

  pathMarkers._line = viewer.entities.add({
    polyline: {
      positions: pathPoints.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)),
      width: 2,
      material: Cesium.Color.DODGERBLUE.withAlpha(0.55),
      clampToGround: false,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

export function stopPicking() {
  if (pickHandler) { pickHandler.destroy(); pickHandler = null; }
  pickingActive = false;
  onPathUpdate = null;
}

export function clearPath(viewer) {
  pathMarkers.forEach((m) => viewer.entities.remove(m));
  if (pathMarkers._line) viewer.entities.remove(pathMarkers._line);
  pathMarkers = [];
  pathPoints = [];
}

export function getPathPointCount() { return pathPoints.length; }
export function isPicking() { return pickingActive; }

// ==================== Vehicle Simulation ====================

export function startVehicleSimulation(viewer, options = {}) {
  const { speed } = { speed: 25, ...options };

  if (activeVehicle) stopVehicleSimulation(viewer);
  if (pathPoints.length < 2) {
    alert('Please pick at least 2 path points on the map first.');
    return null;
  }

  stopPicking();

  const bodyPos = new Cesium.SampledPositionProperty();
  const totalSeconds = computePathLength(pathPoints) / speed;
  const start = Cesium.JulianDate.fromDate(new Date());
  const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());
  const step = totalSeconds / (pathPoints.length - 1);

  pathPoints.forEach((p, i) => {
    const time = Cesium.JulianDate.addSeconds(start, step * i, new Cesium.JulianDate());
    bodyPos.addSample(time, Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  });

  const orientation = new Cesium.VelocityOrientationProperty(bodyPos);

  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = stop.clone();
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  viewer.clock.multiplier = 1;

  // Car using GroundVehicle.glb model
  const car = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start, stop }),
    ]),
    position: bodyPos,
    orientation,
    model: {
      uri: '/data/Models/GroundVehicle.glb',
      scale: 3.0,
      minimumPixelSize: 100,
      maximumScale: 200,
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.12,
        color: Cesium.Color.DODGERBLUE,
      }),
      width: 4,
    },
  });

  // First-person camera: update each frame
  const camUpdater = function (scene, time) {
    if (!activeVehicle || activeVehicle.entity !== car) {
      viewer.scene.preUpdate.removeEventListener(camUpdater);
      return;
    }
    const pos = bodyPos.getValue(viewer.clock.currentTime);
    const ori = orientation.getValue(viewer.clock.currentTime);
    if (!Cesium.defined(pos) || !Cesium.defined(ori)) return;

    // Driver's eye position: 2m above car center
    const eyeOffset = Cesium.Matrix3.multiplyByVector(
      Cesium.Matrix3.fromQuaternion(ori),
      new Cesium.Cartesian3(0, 0, 2),
      new Cesium.Cartesian3()
    );
    const eyePos = Cesium.Cartesian3.add(pos, eyeOffset, new Cesium.Cartesian3());

    // Look direction: forward from car orientation
    const forward = Cesium.Matrix3.multiplyByVector(
      Cesium.Matrix3.fromQuaternion(ori),
      new Cesium.Cartesian3(1, 0, 0),
      new Cesium.Cartesian3()
    );
    const lookTarget = Cesium.Cartesian3.add(eyePos, forward, new Cesium.Cartesian3());

    scene.camera.setView({
      destination: eyePos,
      orientation: {
        direction: Cesium.Cartesian3.subtract(lookTarget, eyePos, new Cesium.Cartesian3()),
        up: Cesium.Cartesian3.UNIT_Z,
      },
    });
  };
  viewer.scene.preUpdate.addEventListener(camUpdater);

  viewer.clock.shouldAnimate = true;

  activeVehicle = { entity: car, start, stop };
  return car;
}

export function stopVehicleSimulation(viewer) {
  viewer.trackedEntity = undefined;
  if (activeVehicle) {
    viewer.entities.remove(activeVehicle.entity);
    activeVehicle = null;
  }
  viewer.clock.shouldAnimate = false;
}

// ==================== Util ====================

function computePathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const { lon: l1, lat: a1 } = points[i - 1];
    const { lon: l2, lat: a2 } = points[i];
    const dLat = (a2 - a1) * 111320;
    const dLon = (l2 - l1) * 111320 * Math.cos(((a1 + a2) / 2) * Math.PI / 180);
    total += Math.sqrt(dLat * dLat + dLon * dLon);
  }
  return total;
}
