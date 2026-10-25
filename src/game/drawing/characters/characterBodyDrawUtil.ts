/* This file paints raster or placeholder body parts from resolved transforms without calculating poses or attachments.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { getArmThickness, transformBodyPoint } from '@/game/characterBody';
import ResolvedBodyPart from '@/game/characterBody/types/ResolvedBodyPart';
import Point from '@/game/types/Point';
import ImageSet from '@/game/types/ImageSet';
import { findImageBitmap } from '@/game/imageAssetUtil';
import { COLOR_BLACK } from '../drawColorConstants';

const ARM_BEND = Math.PI / 12;
const BORDER_WIDTH_PIXELS = 2;

function _drawCrosshair(point:Point, resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  const [x, y] = transformBodyPoint(resolved.transform, point);
  context.moveTo(x - 4, y);
  context.lineTo(x + 4, y);
  context.moveTo(x, y - 4);
  context.lineTo(x, y + 4);
}

function _drawPivotCrosshair(resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  const [x, y] = transformBodyPoint(resolved.transform, resolved.part.pivotPoint);
  const offset = 4 / Math.SQRT2;
  context.moveTo(x - offset, y - offset);
  context.lineTo(x + offset, y + offset);
  context.moveTo(x - offset, y + offset);
  context.lineTo(x + offset, y - offset);
}

function _drawPartBounds(resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  const { width, height } = resolved.part;
  const corners:readonly Point[] = [[0, 0], [width, 0], [width, height], [0, height]];
  context.beginPath();
  corners.forEach((point, pointI) => {
    const [x, y] = transformBodyPoint(resolved.transform, point);
    if (pointI === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.stroke();
}

export function drawCharacterAttachmentMarkers(parts:readonly ResolvedBodyPart[], context:CanvasRenderingContext2D) {
  context.save();
  context.lineWidth = 1;
  context.lineCap = 'butt';
  context.strokeStyle = '#00f';
  parts.forEach(resolved => _drawPartBounds(resolved, context));
  context.strokeStyle = COLOR_BLACK;
  context.beginPath();
  parts.forEach(resolved => {
    _drawPivotCrosshair(resolved, context);
    resolved.part.connectedParts.forEach(connection => _drawCrosshair(connection.connectionPoint, resolved, context));
  });
  context.stroke();
  context.restore();
}

function _drawPolygon(points:readonly Point[], inset:number, resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  context.beginPath();
  points.forEach((point, pointI) => {
    const [x, y] = transformBodyPoint(resolved.transform, [point[0] + inset, point[1] + inset]);
    if (pointI === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fill();
  context.stroke();
}

function _drawTorso(width:number, height:number, inset:number, resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  _drawPolygon([[0, 0], [width, 0], [width, height], [0, height]], inset, resolved, context);
}

function _drawLeg(width:number, height:number, inset:number, resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  const thickness = Math.min(width / 2, height / 4);
  _drawPolygon([[0, 0], [thickness, 0], [thickness, height - thickness],
    [width, height - thickness], [width, height], [0, height]], inset, resolved, context);
}

function _drawArm(width:number, height:number, inset:number, resolved:ResolvedBodyPart, context:CanvasRenderingContext2D) {
  const sine = Math.sin(ARM_BEND);
  const cosine = Math.cos(ARM_BEND);
  const thickness = getArmThickness(resolved.part.width, resolved.part.height) - inset * 2;
  const length = Math.min(height / (2 * cosine), (width - thickness * cosine) / sine);
  const jointY = height - length * cosine;
  _drawPolygon([[0, 0], [thickness, 0], [thickness, jointY], [0, jointY]], inset, resolved, context);
  _drawPolygon([[0, jointY], [thickness * cosine, jointY - thickness * sine],
    [thickness * cosine + length * sine, height - thickness * sine], [length * sine, height]], inset, resolved, context);
}

/** Paints one non-head part; vector placeholders have a fixed canvas-pixel border. Does not determine paint order. */
export function drawCharacterBodyPart(resolved:ResolvedBodyPart, imageSet:ImageSet, context:CanvasRenderingContext2D) {
  const { part, transform } = resolved;
  assert(part.kind !== 'head'); // Head artwork uses the head painter.
  const image = findImageBitmap(imageSet, part.imageUrl);
  if (image) {
    context.save();
    context.transform(transform.horizontalX, transform.horizontalY, transform.verticalX,
      transform.verticalY, transform.translateX, transform.translateY);
    context.drawImage(image, 0, 0, part.width, part.height);
    context.restore();
    return;
  }
  const scale = Math.min(Math.hypot(transform.horizontalX, transform.horizontalY),
      Math.hypot(transform.verticalX, transform.verticalY));
  const inset = BORDER_WIDTH_PIXELS / (2 * scale);
  const width = part.width - inset * 2;
  const height = part.height - inset * 2;
  context.save();
  context.fillStyle = '#fff';
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = BORDER_WIDTH_PIXELS;
  context.lineJoin = 'round';
  if (part.kind === 'torso') {
    _drawTorso(width, height, inset, resolved, context);
  } else if (part.kind === 'leftLeg' || part.kind === 'rightLeg') {
    _drawLeg(width, height, inset, resolved, context);
  } else {
    assert(part.kind === 'leftArm' || part.kind === 'rightArm');
    _drawArm(width, height, inset, resolved, context);
  }
  context.restore();
}