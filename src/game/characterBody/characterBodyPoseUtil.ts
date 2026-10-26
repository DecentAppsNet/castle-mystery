/* This file resolves character body attachments, grounded postures, bounds, and paint order without mutating definitions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { composeBodyTransforms, createBodyAttachmentTransform, transformBodyRect } from './characterBodyTransformUtil';
import { createRect, extendRectToContainRect } from '../rectUtil';
import BodyPart from './types/BodyPart';
import BodyPartTransform from './types/BodyPartTransform';
import PartKind from './types/PartKind';
import Point from '../types/Point';
import Rect from '../types/Rect';
import ResolvedBodyPart from './types/ResolvedBodyPart';
import type { BodyOrientation, FacingDirection } from '../types/Character';

const DEGREES_90 = Math.PI / 2;

type BodyPartRotations = { readonly [kind in PartKind]?:number }; // Local rotation angles in radians.

function _resolvePart(part:BodyPart, transform:BodyPartTransform, rotations:BodyPartRotations,
  resolved:ResolvedBodyPart[], reflectTorsoAttachments:boolean = false) {
  assert(!resolved.some(entry => entry.part.kind === part.kind), 'Body part kinds must be unique.');
  resolved.push({ part, transform });
  part.connectedParts.forEach(connection => {
    const kind = connection.part.kind;
    const isPairedLimb = kind === 'farArm' || kind === 'nearArm' || kind === 'leftLeg' || kind === 'rightLeg';
    const connectionPoint:Point = reflectTorsoAttachments && part.kind === 'torso' && isPairedLimb
      ? [part.width - connection.connectionPoint[0], connection.connectionPoint[1]]
      : connection.connectionPoint;
    const attachment = createBodyAttachmentTransform(connectionPoint,
      connection.part.pivotPoint, rotations[connection.part.kind] ?? 0);
    _resolvePart(connection.part, composeBodyTransforms(transform, attachment), rotations, resolved, reflectTorsoAttachments);
  });
}

function _getLegAngle(orientation:BodyOrientation):number {
  return orientation === 'sitting' 
    ? -DEGREES_90 
    : orientation === 'kneeling' ? DEGREES_90 : 0;
}

/**
 * Resolves parent-first placement while retaining the original definition references unchanged.
 * rootTransform maps the root's local game units to layout space; child rotations are local radians.
 * Resolution order is independent of paint order. Part kinds must be unique within the tree.
 */
export function resolveBodyHierarchy(root:BodyPart, rootTransform:BodyPartTransform,
    rotations:BodyPartRotations = {}):readonly ResolvedBodyPart[] {
  const resolved:ResolvedBodyPart[] = [];
  _resolvePart(root, rootTransform, rotations, resolved);
  return resolved;
}

/** Returns the requested placement; a missing kind violates the body's internal contract. */
export function getResolvedBodyPart(parts:readonly ResolvedBodyPart[], kind:PartKind):ResolvedBodyPart {
  const resolved = parts.find(entry => entry.part.kind === kind);
  assertNonNullable(resolved);
  return resolved;
}

/** Returns the union of part drawing bounds in their shared output-space units; parts must be nonempty. */
export function getBodyBounds(parts:readonly ResolvedBodyPart[]):Rect {
  assert(parts.length > 0, 'Body bounds require at least one resolved part.');
  const bounds = parts.map(({ part, transform }) =>
    transformBodyRect(transform, createRect(0, 0, part.width, part.height)));
  return bounds.slice(1).reduce(extendRectToContainRect, bounds[0]);
}

/**
 * Creates ephemeral placement in game units with the support surface at Y = 0 and root pivot X = 0.
 * Standing rests on the feet; other postures rest on the torso regardless of protruding children.
 * Facing mirrors artwork; only vector placeholders reflect right-facing torso limb attachments.
 * Raster bodies retain authored connections in every posture before whole-pose reflection.
 * Part identities and definitions remain unchanged; vector arm roles retain legacy hand ownership.
 */
export function createBodyPose(root:BodyPart, orientation:BodyOrientation, facing:FacingDirection):readonly ResolvedBodyPart[] {
  const legAngle = _getLegAngle(orientation);
  const rootTransform = createBodyAttachmentTransform([0, 0], root.pivotPoint,
    orientation === 'laying' ? -DEGREES_90 : 0);
  const parts:ResolvedBodyPart[] = [];
  const reflectVectorAttachments = root.imageUrl === null && facing === 'right';
  _resolvePart(root, rootTransform, { leftLeg:legAngle, rightLeg:legAngle }, parts, reflectVectorAttachments);
  const supports = orientation === 'standing'
    ? [getResolvedBodyPart(parts, 'leftLeg'), getResolvedBodyPart(parts, 'rightLeg')]
    : [getResolvedBodyPart(parts, 'torso')];
  const supportBounds = getBodyBounds(supports);
  const grounding:BodyPartTransform = {
    horizontalX:facing === 'left' ? -1 : 1, horizontalY:0, verticalX:0, verticalY:1,
    translateX:0, translateY:-(supportBounds.y + supportBounds.height)
  };
  return parts.map(({ part, transform }) => ({ part, transform:composeBodyTransforms(grounding, transform) }));
}

const _rightFacingPaintOrder:readonly PartKind[] = ['farArm', 'leftLeg', 'rightLeg', 'torso', 'head', 'nearArm'];
const _leftFacingPaintOrder:readonly PartKind[] = ['nearArm', 'rightLeg', 'leftLeg', 'torso', 'head', 'farArm'];
const _rasterLeftFacingPaintOrder:readonly PartKind[] = ['farArm', 'rightLeg', 'leftLeg', 'torso', 'head', 'nearArm'];

/** Returns back-to-front order; raster arms retain fixed far/near roles under facing reflection. */
export function getBodyPaintOrder(facing:FacingDirection, isRasterBody:boolean = false):readonly PartKind[] {
  if (isRasterBody && facing === 'left') return _rasterLeftFacingPaintOrder;
  return facing === 'right' ? _rightFacingPaintOrder : _leftFacingPaintOrder;
}