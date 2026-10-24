/* This file paints placeholder body parts from resolved canvas transforms without calculating poses or attachments.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { transformBodyPoint } from '@/game/characterBody';
import ResolvedBodyPart from '@/game/characterBody/types/ResolvedBodyPart';
import Point from '@/game/types/Point';
import { COLOR_BLACK } from '../drawColorConstants';

const ARM_BEND = Math.PI / 12;

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
  const thickness = Math.min(width / 2, height / 4);
  const length = Math.min(height / (2 * cosine), (width - thickness * cosine) / sine);
  const jointY = height - length * cosine;
  _drawPolygon([[0, 0], [thickness, 0], [thickness, jointY], [0, jointY]], inset, resolved, context);
  _drawPolygon([[0, jointY], [thickness * cosine, jointY - thickness * sine],
    [thickness * cosine + length * sine, height - thickness * sine], [length * sine, height]], inset, resolved, context);
}

/** Paints one non-head part; transform output and lineWidth are canvas pixels. Does not determine paint order. */
export function drawCharacterBodyPart(resolved:ResolvedBodyPart, lineWidth:number, context:CanvasRenderingContext2D) {
  const { part, transform } = resolved;
  assert(part.kind !== 'head'); // Head artwork uses the head painter.
  const scale = Math.min(Math.hypot(transform.horizontalX, transform.horizontalY),
      Math.hypot(transform.verticalX, transform.verticalY));
  const strokeWidth = Math.min(lineWidth, Math.min(part.width, part.height) * scale / 4);
  const inset = strokeWidth / (2 * scale);
  const width = part.width - inset * 2;
  const height = part.height - inset * 2;
  context.save();
  context.fillStyle = '#fff';
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = strokeWidth;
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