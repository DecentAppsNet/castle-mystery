/* This file groups the canvas-coordinate obscured-polygon overlay effect.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Visual canvas effect requires manual verification. @preserve */

import Point from "@/game/types/Point";

const OBSCURE_ALPHA = 1;
const OBSCURE_PHASE = .3;
const OBSCURE_DENSITY = 1;
const OBSCURE_BRIGHTNESS = 1;

function _polygonPath(points:ReadonlyArray<Point>, context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; ++i) context.lineTo(points[i][0], points[i][1]);
  context.closePath();
}

function _faceCenter(points:ReadonlyArray<Point>):Point {
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}

function _faceBounds(points:ReadonlyArray<Point>) {
  return {
    minX:Math.min(...points.map(point => point[0])),
    maxX:Math.max(...points.map(point => point[0])),
    minY:Math.min(...points.map(point => point[1])),
    maxY:Math.max(...points.map(point => point[1]))
  };
}

export function drawObscuredPolygon(canvasPoints:ReadonlyArray<Point>, context:CanvasRenderingContext2D, metaTime:number,
  clipPath?:Path2D) {
  const time = metaTime;
  const [centerX, centerY] = _faceCenter(canvasPoints);
  const bounds = _faceBounds(canvasPoints);

  context.save();
  if (clipPath) {
    context.clip(clipPath);
  } else {
    _polygonPath(canvasPoints, context);
    context.clip();
  }

  context.fillStyle = "rgba(2, 2, 2, 0.80)";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  const baseGlow = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    120
  );
  baseGlow.addColorStop(0, `rgba(60, 60, 60, ${0.14 * OBSCURE_ALPHA})`);
  baseGlow.addColorStop(0.6, `rgba(20, 20, 20, ${0.12 * OBSCURE_ALPHA})`);
  baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = baseGlow;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  const largeCount = Math.floor(22 * OBSCURE_DENSITY);
  for (let i = 0; i < largeCount; ++i) {
    const seed = i * 37.723 + OBSCURE_PHASE * 91.17;
    const rollA = time * 0.00028;
    const rollB = time * 0.00017;
    const x = centerX
      + Math.sin(seed + rollA * 2.1) * (bounds.maxX - bounds.minX) * 0.42
      + Math.sin(seed * 0.37 + rollB * 3.3) * 22;
    const y = centerY
      + Math.cos(seed * 1.13 + rollA * 1.7) * (bounds.maxY - bounds.minY) * 0.42
      + Math.cos(seed * 0.51 + rollB * 2.8) * 16;
    const radius = 82 + 18 * (0.5 + 0.5 * Math.sin(seed * 0.91 + time * 0.0008));
    const opacity = (0.055 + 0.07 * (0.5 + 0.5 * Math.sin(seed + time * 0.0013))) * OBSCURE_ALPHA * OBSCURE_BRIGHTNESS;

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(210, 210, 210, ${opacity})`);
    gradient.addColorStop(0.34, `rgba(115, 115, 115, ${opacity * 0.75})`);
    gradient.addColorStop(0.68, `rgba(38, 38, 38, ${opacity * 0.35})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const smallCount = Math.floor(54 * OBSCURE_DENSITY);
  for (let i = 0; i < smallCount; ++i) {
    const seed = i * 71.19 + OBSCURE_PHASE * 53.4;
    const orbit = Math.sin(time * 0.00042 + seed) * 0.5
      + Math.cos(time * 0.00031 + seed * 1.4) * 0.5;
    const x = centerX
      + Math.sin(seed * 0.84 + time * 0.00045) * (bounds.maxX - bounds.minX) * 0.46
      + Math.sin(seed + time * 0.0012) * 12;
    const y = centerY
      + Math.cos(seed * 0.69 + time * 0.00038) * (bounds.maxY - bounds.minY) * 0.46
      + Math.cos(seed * 1.2 + time * 0.0011) * 10;
    const radius = 70 + 9 * (0.5 + 0.5 * Math.sin(seed + time * 0.0018 + orbit));
    const opacity = (0.035 + 0.06 * Math.max(0, orbit)) * OBSCURE_ALPHA * OBSCURE_BRIGHTNESS;

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(235, 235, 235, ${opacity})`);
    gradient.addColorStop(0.45, `rgba(130, 130, 130, ${opacity * 0.58})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  for (let w = 0; w < 13 * OBSCURE_DENSITY; ++w) {
    const seed = w * 29.47 + OBSCURE_PHASE * 44;
    const yBase = bounds.minY + ((w + 0.5) / (13 * OBSCURE_DENSITY)) * (bounds.maxY - bounds.minY);
    const opacity = (0.035 + 0.05 * (0.5 + 0.5 * Math.sin(time * 0.002 + seed))) * OBSCURE_ALPHA * OBSCURE_BRIGHTNESS;

    context.strokeStyle = `rgba(190, 190, 190, ${opacity})`;
    context.lineWidth = 3.8 + 1.2 * Math.sin(seed + time * 0.001);
    context.beginPath();

    for (let x = bounds.minX - 30; x <= bounds.maxX + 30; x += 8) {
      const y = yBase
        + Math.sin(x * 0.045 + time * 0.0014 + seed) * 9
        + Math.sin(x * 0.091 - time * 0.0011 + seed * 0.6) * 5;
      if (x === bounds.minX - 30) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    context.stroke();
  }

  for (let i = 0; i < 18; ++i) {
    const seed = i * 48.8 + OBSCURE_PHASE * 27;
    const x = centerX + Math.sin(seed - time * 0.00022) * (bounds.maxX - bounds.minX) * 0.48;
    const y = centerY + Math.cos(seed * 1.2 - time * 0.00026) * (bounds.maxY - bounds.minY) * 0.48;
    const radius = 28 + 18 * (0.5 + 0.5 * Math.sin(seed + time * 0.0009));

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.22)");
    gradient.addColorStop(0.65, "rgba(0, 0, 0, 0.10)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}