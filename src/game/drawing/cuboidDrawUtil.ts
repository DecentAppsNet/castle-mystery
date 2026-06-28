/* This module groups cuboid drawing helpers used by room, stair, and item rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { COLOR_BLACK } from "./drawColorConstants";
import { drawClippedTransformedTextureFace, type TextureFaceImage } from "./textureFaceDrawUtil";

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
  topFaceImage?:TextureFaceImage|null,
  sideFaceImage?:TextureFaceImage|null,
  frontFaceImage?:TextureFaceImage|null,
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

function _drawFace(points:CanvasPoint[], fillStyle:string, faceImage:TextureFaceImage|null|undefined,
  origin:CanvasPoint, horizontalVector:CanvasPoint, verticalVector:CanvasPoint, context:CanvasRenderingContext2D) {
  if (faceImage) {
    drawClippedTransformedTextureFace(faceImage, origin, horizontalVector, verticalVector, points, context);
    return;
  }
  context.fillStyle = fillStyle;
  _fillFace(points, context);
}

export function drawProjectedCuboid(cuboid:ProjectedCuboid, options:DrawProjectedCuboidOptions, context:CanvasRenderingContext2D) {
  context.save();
  _drawFace(
    [cuboid.backTopLeft, cuboid.backTopRight, cuboid.frontTopRight, cuboid.frontTopLeft],
    options.topFillStyle,
    options.topFaceImage,
    cuboid.backTopLeft,
    [cuboid.backTopRight[0] - cuboid.backTopLeft[0], cuboid.backTopRight[1] - cuboid.backTopLeft[1]],
    [cuboid.frontTopLeft[0] - cuboid.backTopLeft[0], cuboid.frontTopLeft[1] - cuboid.backTopLeft[1]],
    context
  );
  _drawFace(
    [cuboid.backTopLeft, cuboid.backBottomLeft, cuboid.frontBottomLeft, cuboid.frontTopLeft],
    options.sideFillStyle,
    options.sideFaceImage,
    cuboid.backTopLeft,
    [cuboid.frontTopLeft[0] - cuboid.backTopLeft[0], cuboid.frontTopLeft[1] - cuboid.backTopLeft[1]],
    [cuboid.backBottomLeft[0] - cuboid.backTopLeft[0], cuboid.backBottomLeft[1] - cuboid.backTopLeft[1]],
    context
  );
  _drawFace(
    [cuboid.frontTopLeft, cuboid.frontTopRight, cuboid.frontBottomRight, cuboid.frontBottomLeft],
    options.frontFillStyle,
    options.frontFaceImage,
    cuboid.frontTopLeft,
    [cuboid.frontTopRight[0] - cuboid.frontTopLeft[0], cuboid.frontTopRight[1] - cuboid.frontTopLeft[1]],
    [cuboid.frontBottomLeft[0] - cuboid.frontTopLeft[0], cuboid.frontBottomLeft[1] - cuboid.frontTopLeft[1]],
    context
  );

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