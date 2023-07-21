import { debug } from 'console';
import { nswPoints, vicPoints } from './data/au.js';
import { randomPoints } from './data/random.js';
import {
  Vector,
  convertToVec,
  crossProduct,
  dotProduct,
  lengthVector,
  lineBetween,
  multiplyVector,
  unitVector,
  vecToString,
} from './helper.js';
import * as glm from 'gl-matrix';

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
  camera: Vector,
  style: { front: string; back?: string },
) {
  const cameraVec3 = glm.vec3.fromValues(camera.x, camera.y, camera.z);

  const cameraUp = glm.vec3.rotateZ(glm.vec3.create(), cameraVec3, cameraVec3, Math.PI / 4);

  const look = glm.mat4.lookAt(
    glm.mat4.create(),
    cameraVec3,
    glm.vec3.fromValues(0, 0, 0),
    glm.vec3.fromValues(0, 0, 1),
  );

  const perspective = glm.mat4.perspective(glm.mat4.create(), Math.PI / 3, 1, 0, 4);
  //  glm.mat4.ortho(perspective, -2, 2, -2, 2, 4, 8);

  const mvp = glm.mat4.multiply(glm.mat4.create(), perspective, look);

  points.forEach((p) => {
    let radius = scale * 2;

    // TODO: This part is entirely for our own culling/coloring.

    // middle of planet is zero vec: find extrapolation as unit vector
    const vec = convertToVec(p);

    // get line from camera to vec
    const dir = unitVector(lineBetween(camera, vec));

    // If the vector points away from the camera, don't render it.
    const dp = dotProduct(dir, vec);
    const vecOnRear = dp > 0;
    ctx.fillStyle = vecOnRear ? style.back ?? 'pink' : style.front;

    const cp = glm.vec3.transformMat4(
      glm.vec3.create(),
      glm.vec3.fromValues(vec.x, vec.y, vec.z),
      mvp,
    );

    const renderFactor = worldSize;
    radius *= (cp[2] * worldSize) / 400;
    if (cp[2] <= 0.0 || radius < 0.0) {
      return;
    }

    // TODO: shows middle line of planet
    if (Math.abs(p.lat) < 0.1) {
      ctx.fillStyle = 'black';
    }

    ctx.beginPath();
    ctx.arc(cp[0] * renderFactor, cp[1] * renderFactor, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

const shift = {
  lat: 0,
  lng: 0,
};
const shiftDelta = { lat: 0, lng: 0 };

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

  const camera = multiplyVector(convertToVec(shift), -zoomLevel);

  const ctx = canvas.getContext('2d')!;
  ctx.translate(width, height);
  ctx.scale(1 / scale, 1 / scale);

  renderPoints(ctx, points, camera, { front: 'red' });
  renderPoints(ctx, nswPoints, camera, { front: 'blue', back: '#99f' });
  renderPoints(ctx, vicPoints, camera, { front: 'purple', back: '#96f' });

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
