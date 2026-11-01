/* This file projects body poses and resolves shared visual deltas without drawing or changing base grounding.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Point from '../types/Point';
import ScalingFactors from '../types/ScalingFactors';
import { FacingDirection } from '../types/Character';
import CharacterLayout from './types/CharacterLayout';
import ResolvedBodyPart from './types/ResolvedBodyPart';
import BodyPartTransform from './types/BodyPartTransform';
import { getBodyBounds, getResolvedBodyPart, getHandArmPartKind } from './characterBodyPoseUtil';
import { applyBodyTransformDeltas, composeBodyTransforms, invertBodyTransform, transformBodyPoint } from './characterBodyTransformUtil';
import { rotateHeadPose } from './characterHeadGeometryUtil';
import SpriteOverride from '../effects/types/SpriteOverride';

function _getCenter({ part, transform }:ResolvedBodyPart):Point {
  return transformBodyPoint(transform, [part.width / 2, part.height / 2]);
}

function _getHand(parts:readonly ResolvedBodyPart[], armKind:'nearArm'|'farArm'):{ x:number, y:number } {
  const { transform } = getResolvedBodyPart(parts, armKind === 'nearArm' ? 'nearHand' : 'farHand');
  const [x, y] = transformBodyPoint(transform, [0, 0]);
  return { x, y };
}

/** Resolves aggregated concrete deltas parent-first; preserves base bounds, grounding, and unrelated anchors. */
export function createVisualBodyLayout(base:CharacterLayout, overrides:readonly SpriteOverride[],
  facing:FacingDirection):CharacterLayout {
  const parts:ResolvedBodyPart[] = [];
  function _resolve(original:ResolvedBodyPart, inherited:BodyPartTransform|null) {
    const { part } = original;
    const transform = inherited ? composeBodyTransforms(inherited, original.transform) : original.transform;
    const rotation = overrides.find(entry => entry.transformType === 'rotate' && entry.spriteKind === part.kind);
    const translation = overrides.find(entry => (entry.transformType === 'translatePartHeight' || entry.transformType === 'translateCanvas') && entry.spriteKind === part.kind);
    const angle = rotation?.transformType === 'rotate' && (part.kind !== 'head' || part.imageUrl !== null)
      ? rotation.rotateRadians : 0;
    const translateX = translation?.transformType === 'translateCanvas' ? translation.translateCanvasX : 0;
    const translateY = translation?.transformType === 'translatePartHeight'
      ? translation.translateHeightRatio * part.height * Math.hypot(transform.verticalX, transform.verticalY) : translation?.transformType === 'translateCanvas' ? translation.translateCanvasY : 0;
    const unchanged = angle === 0 && translateX === 0 && translateY === 0;
    const resolved = unchanged ? { part, transform } : part.kind === 'head'
      ? rotateHeadPose({ part, transform }, facing, angle)
      : { part, transform:applyBodyTransformDeltas(transform, part.pivotPoint, angle, [translateX, translateY]) };
    parts.push(resolved);
    const delta = unchanged ? inherited : composeBodyTransforms(resolved.transform, invertBodyTransform(original.transform));
    part.connectedParts.forEach(({ part:child }) => _resolve(getResolvedBodyPart(base.parts, child.kind), delta));
  }
  const torso = getResolvedBodyPart(base.parts, 'torso');
  _resolve(torso, null);
  for (const [partI, resolved] of parts.entries()) {
    if (resolved.part.kind !== 'nearHand' && resolved.part.kind !== 'farHand') continue;
    const reference = resolved.transform;
    let translateX = 0, translateY = 0;
    for (const override of overrides) {
      if (override.transformType !== 'deferredHandDisplacement' || override.spriteKind !== resolved.part.kind) continue;
      translateX += override.weight * (override.destinationCanvasPoint[0] - reference.translateX);
      translateY += override.weight * (override.destinationCanvasPoint[1] - reference.translateY);
    }
    parts[partI] = { ...resolved,
      transform:{ ...reference, translateX:reference.translateX + translateX, translateY:reference.translateY + translateY } };
  }
  const isRasterBody = torso.part.imageUrl !== null;
  return { ...base, parts,
    leftHand:_getHand(parts, getHandArmPartKind(isRasterBody, facing, 'left')),
    rightHand:_getHand(parts, getHandArmPartKind(isRasterBody, facing, 'right')) };
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
  const isRasterBody = getResolvedBodyPart(parts, 'torso').part.imageUrl !== null;
  return {
    parts, bounds,
    characterCenterCanvasPoint:_getCenter(getResolvedBodyPart(parts, 'torso')),
    head:{ centerX, centerY, radius:Math.max(headBounds.width, headBounds.height) / 2 },
    leftHand:_getHand(parts, getHandArmPartKind(isRasterBody, facing, 'left')),
    rightHand:_getHand(parts, getHandArmPartKind(isRasterBody, facing, 'right')),
    anchorX:centerX, anchorTopY:bounds.y
  };
}