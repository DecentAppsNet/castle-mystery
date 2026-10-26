/* This file projects resolved body poses into shared canvas geometry without drawing or world projection.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from 'decent-portal';
import Point from '../types/Point';
import ScalingFactors from '../types/ScalingFactors';
import { FacingDirection } from '../types/Character';
import CharacterLayout from './types/CharacterLayout';
import ResolvedBodyPart from './types/ResolvedBodyPart';
import BodyPartTransform from './types/BodyPartTransform';
import { getBodyBounds, getResolvedBodyPart } from './characterBodyPoseUtil';
import { composeBodyTransforms, transformBodyPoint } from './characterBodyTransformUtil';

function _getCenter({ part, transform }:ResolvedBodyPart):Point {
  return transformBodyPoint(transform, [part.width / 2, part.height / 2]);
}

function _getHand({ part, transform }:ResolvedBodyPart):{ x:number, y:number } {
  assertNonNullable(part.handPoint);
  const [x, y] = transformBodyPoint(transform, part.handPoint);
  return { x, y };
}

/** Projects a grounded pose to canvas pixels; maps raster depth roles to gameplay hands, retaining vector ownership. */
export function createBodyCanvasLayout(pose:readonly ResolvedBodyPart[], supportAnchor:Point,
  scalingFactors:Pick<ScalingFactors, 'scaleX'|'scaleY'>, facing:FacingDirection = 'right'):CharacterLayout {
  const projection:BodyPartTransform = {
    horizontalX:scalingFactors.scaleX, horizontalY:0, verticalX:0, verticalY:scalingFactors.scaleY,
    translateX:supportAnchor[0], translateY:supportAnchor[1]
  };
  const parts = pose.map(({ part, transform }) => ({ part, transform:composeBodyTransforms(projection, transform) }));
  const bounds = getBodyBounds(parts);
  const head = getResolvedBodyPart(parts, 'head');
  const [centerX, centerY] = _getCenter(head);
  const headBounds = getBodyBounds([head]);
  const swapHandRoles = facing === 'left' && getResolvedBodyPart(parts, 'torso').part.imageUrl !== null;
  return {
    parts, bounds,
    characterCenterCanvasPoint:_getCenter(getResolvedBodyPart(parts, 'torso')),
    head:{ centerX, centerY, radius:Math.max(headBounds.width, headBounds.height) / 2 },
    leftHand:_getHand(getResolvedBodyPart(parts, swapHandRoles ? 'nearArm' : 'farArm')),
    rightHand:_getHand(getResolvedBodyPart(parts, swapHandRoles ? 'farArm' : 'nearArm')),
    anchorX:centerX, anchorTopY:bounds.y
  };
}