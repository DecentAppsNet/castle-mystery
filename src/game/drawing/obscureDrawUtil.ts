/* This module groups the bespoke obscured-room overlay effect.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";
import { projectRoomPointWithDepth } from "./roomPanelProjectionUtil";

type CanvasPoint = Readonly<{
  x:number,
  y:number
}>;

const OBSCURE_ALPHA = 1;
const OBSCURE_PHASE = .3;
const OBSCURE_DENSITY = 0.3;
const OBSCURE_BRIGHTNESS = 1;

function _polygonPath(points:ReadonlyArray<CanvasPoint>, context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; ++i) context.lineTo(points[i].x, points[i].y);
  context.closePath();
}

function _faceCenter(points:ReadonlyArray<CanvasPoint>):CanvasPoint {
  return {
    x:points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y:points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function _faceBounds(points:ReadonlyArray<CanvasPoint>) {
  return {
    minX:Math.min(...points.map(point => point.x)),
    maxX:Math.max(...points.map(point => point.x)),
    minY:Math.min(...points.map(point => point.y)),
    maxY:Math.max(...points.map(point => point.y))
  };
}

function _createObscuredRoomPoints(room:Room, scalingFactors:ScalingFactors):CanvasPoint[] {
  const [topLeftBackX, topLeftBackY] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [topRightFrontX, topRightFrontY] = projectRoomPointWithDepth(room.rect.x + room.rect.width, room.rect.y, 1, scalingFactors);
  const [topRightBackX, topRightBackY] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y, scalingFactors);
  const [bottomRightFrontX, bottomRightFrontY] = projectRoomPointWithDepth(room.rect.x + room.rect.width, room.rect.y + room.rect.height, 1, scalingFactors);
  const [bottomLeftFrontX, bottomLeftFrontY] = projectRoomPointWithDepth(room.rect.x, room.rect.y + room.rect.height, 1, scalingFactors);
  const [bottomLeftBackX, bottomLeftBackY] = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);

  return [
    { x:topLeftBackX, y:topLeftBackY },
    { x:topRightBackX, y:topRightBackY },
    { x:topRightFrontX, y:topRightFrontY },
    { x:bottomRightFrontX, y:bottomRightFrontY },
    { x:bottomLeftFrontX, y:bottomLeftFrontY },
    { x:bottomLeftBackX, y:bottomLeftBackY }
  ];
}

export function drawObscuredRoom(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const points = _createObscuredRoomPoints(room, scalingFactors);
  const time = Date.now();
  const center = _faceCenter(points);
  const bounds = _faceBounds(points);

  context.save();
  _polygonPath(points, context);
  context.clip();

  context.fillStyle = "rgba(2, 2, 2, 0.90)";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  const baseGlow = context.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
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
    const x = center.x
      + Math.sin(seed + rollA * 2.1) * (bounds.maxX - bounds.minX) * 0.42
      + Math.sin(seed * 0.37 + rollB * 3.3) * 22;
    const y = center.y
      + Math.cos(seed * 1.13 + rollA * 1.7) * (bounds.maxY - bounds.minY) * 0.42
      + Math.cos(seed * 0.51 + rollB * 2.8) * 16;
    const radius = 22 + 18 * (0.5 + 0.5 * Math.sin(seed * 0.91 + time * 0.0008));
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
    const x = center.x
      + Math.sin(seed * 0.84 + time * 0.00045) * (bounds.maxX - bounds.minX) * 0.46
      + Math.sin(seed + time * 0.0012) * 12;
    const y = center.y
      + Math.cos(seed * 0.69 + time * 0.00038) * (bounds.maxY - bounds.minY) * 0.46
      + Math.cos(seed * 1.2 + time * 0.0011) * 10;
    const radius = 7 + 9 * (0.5 + 0.5 * Math.sin(seed + time * 0.0018 + orbit));
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
    context.lineWidth = 1.8 + 1.2 * Math.sin(seed + time * 0.001);
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
    const x = center.x + Math.sin(seed - time * 0.00022) * (bounds.maxX - bounds.minX) * 0.48;
    const y = center.y + Math.cos(seed * 1.2 - time * 0.00026) * (bounds.maxY - bounds.minY) * 0.48;
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