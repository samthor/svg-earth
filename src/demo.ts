import { nswPoints, vicPoints } from './data/au.js';
import { randomPoints } from './data/random.js';
import { LatLng, convertToVec, vecToString } from './helper.js';
import * as glm from 'gl-matrix';
import { parseShp } from './lib/shp.js';
import simplifyJs from 'simplify-js';

const points = randomPoints(1000);

const width = 1200;
const height = 1200;
const scale = 2;
const worldSize = 1180;

// At about ~40 this stops being useful - same result
let zoomLevel = 2; // nb. World is unit size, distance is to center

const fpsElement = document.createElement('code');
fpsElement.style.display = 'block';
const canvas = document.createElement('canvas');
canvas.width = width * scale;
canvas.height = height * scale;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
canvas.tabIndex = 0;
document.body.append(canvas, fpsElement);
canvas.focus();

function renderPoints(
  ctx: CanvasRenderingContext2D,
  points: Array<{ lat: number; lng: number }>,
  camera: glm.vec3,
  style: { front: string; back?: string },
) {
  const look = glm.mat4.lookAt(
    glm.mat4.create(),
    camera,
    glm.vec3.fromValues(0, 0, 0),
    glm.vec3.fromValues(0, 0, 1),
  );

  // TODO: same for all shapes
  const perspective = glm.mat4.perspective(glm.mat4.create(), Math.PI / 3, 1, 0, 4);
  //  glm.mat4.ortho(perspective, -2, 2, -2, 2, 4, 8);
  const mvp = glm.mat4.multiply(glm.mat4.create(), perspective, look);

  const renderFactor = worldSize;

  // Find runs of visible points
  const linesToRender: glm.vec3[][] = [];
  let pendingPoints: glm.vec3[] = [];

  points.forEach((p, i) => {
    const vec = convertToVec(p);

    // get line from camera to vec
    const dir = glm.vec3.subtract(glm.vec3.create(), camera, vec);
    glm.vec3.normalize(dir, dir);

    // If the vector points away from the camera, don't render it.
    const dp = glm.vec3.dot(dir, vec);
    const vecOnRear = dp < 0;
    if (vecOnRear) {
      if (pendingPoints.length > 1) {
        linesToRender.push(pendingPoints);
      }
      pendingPoints = [];
      return;
    }

    const cp = glm.vec3.transformMat4(glm.vec3.create(), vec, mvp);
    pendingPoints.push(cp);
  });

  if (pendingPoints.length > 1) {
    linesToRender.push(pendingPoints);
    pendingPoints = [];
  }

  linesToRender.forEach((line) => {
    ctx.beginPath();

    const firstPoint = line[0];
    ctx.moveTo(firstPoint[0] * renderFactor, firstPoint[1] * renderFactor);

    for (let i = 1; i < line.length; ++i) {
      const point = line[i];
      ctx.lineTo(point[0] * renderFactor, point[1] * renderFactor);
    }

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.stroke();
  });
}

const shift = {
  lat: 0,
  lng: 0,
};
const shiftDelta = { lat: 0, lng: 0 };

const shapesToDraw: LatLng[][] = [];

//shapesToDraw.push(points);

let last = 0;
function draw(time = 0) {
  requestAnimationFrame(draw);
  last = time;

  const start = performance.now();

  canvas.width = canvas.width; // clear

  // TODO: doesn't really work, because -90/+90, need to rotate vector properly
  shift.lat += shiftDelta.lat;
  shift.lng += shiftDelta.lng;

  if (shift.lat >= Math.PI / 2) {
    shiftDelta.lat = 0.0;
    shift.lat = Math.PI / 2;
  } else if (shift.lat <= -Math.PI / 2) {
    shiftDelta.lat = 0.0;
    shift.lat = -Math.PI / 2;
  }

  const camera = glm.vec3.scale(glm.vec3.create(), convertToVec(shift), -zoomLevel);

  const ctx = canvas.getContext('2d')!;
  ctx.translate(width, height);
  ctx.scale(1 / scale, 1 / scale);

  shapesToDraw.forEach((shape) => {
    renderPoints(ctx, shape, camera, { front: 'red' });
  });

  const duration = performance.now() - start;

  const renderParts: string[] = [
    `zoom=${zoomLevel.toFixed(2)}`,
    `render=${duration.toFixed(2)}`,
    `camera=${vecToString(camera)} ll=${shift.lat.toFixed(2)},${shift.lng.toFixed(2)}`,
  ];
  fpsElement.textContent = renderParts.join(', ');
}

canvas.addEventListener('pointerdown', (e) => {
  if (!e.pressure) {
    return;
  }
  shiftDelta.lat = 0.0;
  shiftDelta.lng = 0.0;
});

canvas.addEventListener('pointermove', (e) => {
  if (!e.pressure) {
    return;
  }
  shiftDelta.lat = e.movementY / 400.0;
  shiftDelta.lng = e.movementX / 400.0;
});

canvas.addEventListener('wheel', (e) => {
  // 1.0 is literally "on surface" and looks wacky enough
  zoomLevel = zoomLevel + e.deltaY / 1000.0;
  // zoomLevel = Math.max(1.0, zoomLevel);
});

canvas.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      shiftDelta.lng += 0.01;
      break;
    case 'ArrowRight':
      shiftDelta.lng -= 0.01;
      break;
    case 'ArrowUp':
      shiftDelta.lat += 0.01;
      break;
    case 'ArrowDown':
      shiftDelta.lat -= 0.01;
      break;
    case 'r':
      shift.lat = 0.0;
      shift.lng = 0.0;
    // fall-through
    case 's':
      shiftDelta.lng = 0.0;
      shiftDelta.lat = 0.0;
  }
});

draw();

const r = await fetch('./data.shp');
const raw = await r.arrayBuffer();

const shp = await parseShp(new Uint8Array(raw));
console.info('got shp', shp);

shp.shapes.forEach((shape, i) => {
  const { parts, points } = shape.shape;

  for (let p = 0; p < parts.length; ++p) {
    const start = parts[p];
    const end = parts[p + 1] ?? points.length;
    const slice = points.subarray(start * 2, end * 2);

    const xyPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < slice.length; i += 2) {
      const lng = (slice[i + 0] / 180) * Math.PI;
      const lat = (slice[i + 1] / 180) * Math.PI * -1;

      xyPoints.push({ x: lng, y: lat });
    }

    const simpleXyPoints = simplifyJs(xyPoints, 0.001, false);
    if (!simpleXyPoints.length) {
      return;
    }

    shapesToDraw.push(
      simpleXyPoints.map((p) => {
        return {
          lat: p.y,
          lng: p.x,
        };
      }),
    );
  }

  //  shapesToDraw.push
});
