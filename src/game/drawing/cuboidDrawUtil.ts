/* This module groups cuboid drawing helpers used by room, stair, and item rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { COLOR_BLACK } from "./drawColorConstants";

type CanvasPoint = [number, number];

export type ProjectedCuboid = {
  backTopLeft:CanvasPoint,
  backTopRight:CanvasPoint,
  backBottomLeft:CanvasPoint,
  frontTopLeft:CanvasPoint,
  frontTopRight:CanvasPoint,
  frontBottomLeft:CanvasPoint,
  frontBottomRight:CanvasPoint
}

type DrawProjectedCuboidOptions = {
  topFillStyle:string,
  sideFillStyle:string,
  frontFillStyle:string,
  lineWidth:number,
  strokeStyle?:string
}

function _fillFace(points:CanvasPoint[], context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) context.lineTo(...points[i]);
  context.closePath();
  context.fill();
}

export function drawProjectedCuboid(cuboid:ProjectedCuboid, options:DrawProjectedCuboidOptions, context:CanvasRenderingContext2D) {
  context.save();
  context.fillStyle = options.topFillStyle;
  _fillFace([cuboid.backTopLeft, cuboid.backTopRight, cuboid.frontTopRight, cuboid.frontTopLeft], context);
  context.fillStyle = options.sideFillStyle;
  _fillFace([cuboid.backTopLeft, cuboid.backBottomLeft, cuboid.frontBottomLeft, cuboid.frontTopLeft], context);
  context.fillStyle = options.frontFillStyle;
  _fillFace([cuboid.frontTopLeft, cuboid.frontTopRight, cuboid.frontBottomRight, cuboid.frontBottomLeft], context);

  context.strokeStyle = options.strokeStyle ?? COLOR_BLACK;
  context.lineWidth = options.lineWidth;
  context.beginPath();
  context.moveTo(...cuboid.backTopLeft);
  context.lineTo(...cuboid.backTopRight);
  context.lineTo(...cuboid.frontTopRight);
  context.lineTo(...cuboid.frontBottomRight);
  context.lineTo(...cuboid.frontBottomLeft);
  context.lineTo(...cuboid.backBottomLeft);
  context.lineTo(...cuboid.backTopLeft);
  context.moveTo(...cuboid.frontTopLeft);
  context.lineTo(...cuboid.frontTopRight);
  context.moveTo(...cuboid.frontTopLeft);
  context.lineTo(...cuboid.frontBottomLeft);
  context.moveTo(...cuboid.backTopLeft);
  context.lineTo(...cuboid.frontTopLeft);
  context.moveTo(...cuboid.backTopRight);
  context.lineTo(...cuboid.frontTopRight);
  context.stroke();
  context.restore();
}