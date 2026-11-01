/* This file provides pure affine composition and pivot attachment for character body geometry.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import BodyPartTransform from './types/BodyPartTransform';
import Point from '../types/Point';
import Rect from '../types/Rect';
import { createRect } from '../rectUtil';
import { assert } from 'decent-portal';
import ScalingFactors from '../types/ScalingFactors';

type ViewScale = Pick<ScalingFactors, 'scaleX'|'scaleY'>;

/** Converts a projected body attachment into a transform for artwork already sized in canvas pixels.
 * Removes uniform body scale while preserving inherited rotation, reflection, and the canvas-space origin.
 * Accounts for unequal view scales in game space so camera scaling is not applied twice.
 */
export function createCanvasAttachmentTransform(transform:BodyPartTransform, { scaleX, scaleY }:ViewScale):BodyPartTransform {
  assert(scaleX > 0 && scaleY > 0, 'Attachment view scales must be positive.');
  const bodyScale = Math.hypot(transform.horizontalX / scaleX, transform.horizontalY / scaleY);
  assert(Number.isFinite(bodyScale) && bodyScale > 0, 'Attachment body scale must be finite and positive.');
  return {
    horizontalX:transform.horizontalX / bodyScale / scaleX,
    horizontalY:transform.horizontalY / bodyScale / scaleX,
    verticalX:transform.verticalX / bodyScale / scaleY,
    verticalY:transform.verticalY / bodyScale / scaleY,
    translateX:transform.translateX, translateY:transform.translateY
  };
}

/** Maps an input-space point into the transform's output space, including translation. */
export function transformBodyPoint(transform:BodyPartTransform, point:Point):Point {
  return [
    transform.horizontalX * point[0] + transform.verticalX * point[1] + transform.translateX,
    transform.horizontalY * point[0] + transform.verticalY * point[1] + transform.translateY
  ];
}

/** Returns axis-aligned bounds in output-space units enclosing the entire transformed input rectangle. */
export function transformBodyRect(transform:BodyPartTransform, rect:Rect):Rect {
  const corners = [
    transformBodyPoint(transform, [rect.x, rect.y]),
    transformBodyPoint(transform, [rect.x + rect.width, rect.y]),
    transformBodyPoint(transform, [rect.x, rect.y + rect.height]),
    transformBodyPoint(transform, [rect.x + rect.width, rect.y + rect.height])
  ];
  const left = Math.min(...corners.map(point => point[0]));
  const top = Math.min(...corners.map(point => point[1]));
  return createRect(left, top, Math.max(...corners.map(point => point[0])) - left,
    Math.max(...corners.map(point => point[1])) - top);
}

/** Composes parent * child: applies the child first, then maps its result through the parent. */
export function composeBodyTransforms(parent:BodyPartTransform, child:BodyPartTransform):BodyPartTransform {
  return {
    horizontalX:parent.horizontalX * child.horizontalX + parent.verticalX * child.horizontalY,
    horizontalY:parent.horizontalY * child.horizontalX + parent.verticalY * child.horizontalY,
    verticalX:parent.horizontalX * child.verticalX + parent.verticalX * child.verticalY,
    verticalY:parent.horizontalY * child.verticalX + parent.verticalY * child.verticalY,
    translateX:parent.horizontalX * child.translateX + parent.verticalX * child.translateY + parent.translateX,
    translateY:parent.horizontalY * child.translateX + parent.verticalY * child.translateY + parent.translateY
  };
}

/**
 * Maps a child's local pivot onto a parent-local connection, with both points measured in game units.
 * Rotation is in radians, positive clockwise in downward-Y coordinates; the pivot remains attached.
 */
export function createBodyAttachmentTransform(connectionPoint:Point, pivotPoint:Point,
    rotationRadians:number = 0):BodyPartTransform {
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  return {
    horizontalX:cosine,
    horizontalY:sine,
    verticalX:-sine,
    verticalY:cosine,
    translateX:connectionPoint[0] - cosine * pivotPoint[0] + sine * pivotPoint[1],
    translateY:connectionPoint[1] - sine * pivotPoint[0] - cosine * pivotPoint[1]
  };
}

/** Applies a local-pivot angular delta, then a fixed output-space translation that also moves the pivot. */
export function applyBodyTransformDeltas(base:BodyPartTransform, pivot:Point, rotateRadians:number,
  translation:Point):BodyPartTransform {
  const rotated = composeBodyTransforms(base, createBodyAttachmentTransform(pivot, pivot, rotateRadians));
  return { ...rotated, translateX:rotated.translateX + translation[0], translateY:rotated.translateY + translation[1] };
}

/** Maps output coordinates back to local coordinates; body transforms must be finite and invertible. */
export function invertBodyTransform(transform:BodyPartTransform):BodyPartTransform {
  const { horizontalX, horizontalY, verticalX, verticalY, translateX, translateY } = transform;
  const determinant = horizontalX * verticalY - verticalX * horizontalY;
  assert(Number.isFinite(determinant) && determinant !== 0, 'Body transforms must be invertible.');
  return {
    horizontalX:verticalY / determinant, horizontalY:-horizontalY / determinant,
    verticalX:-verticalX / determinant, verticalY:horizontalX / determinant,
    translateX:(verticalX * translateY - verticalY * translateX) / determinant,
    translateY:(horizontalY * translateX - horizontalX * translateY) / determinant
  };
}