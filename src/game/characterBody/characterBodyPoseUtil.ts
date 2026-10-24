/* This file resolves character body attachments and bounds without mutating static definitions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from 'decent-portal';
import { composeBodyTransforms, createBodyAttachmentTransform, transformBodyRect } from './characterBodyTransformUtil';
import { createRect, extendRectToContainRect } from '../rectUtil';
import BodyPart from './types/BodyPart';
import BodyPartTransform from './types/BodyPartTransform';
import PartKind from './types/PartKind';
import Rect from '../types/Rect';
import ResolvedBodyPart from './types/ResolvedBodyPart';

type BodyPartRotations = { readonly [kind in PartKind]?:number }; // Local rotation angles in radians.

function _resolvePart(part:BodyPart, transform:BodyPartTransform, rotations:BodyPartRotations,
    resolved:ResolvedBodyPart[]) {
  assert(!resolved.some(entry => entry.part.kind === part.kind), 'Body part kinds must be unique.');
  resolved.push({ part, transform });
  part.connectedParts.forEach(connection => {
    const attachment = createBodyAttachmentTransform(connection.connectionPoint,
      connection.part.pivotPoint, rotations[connection.part.kind] ?? 0);
    _resolvePart(connection.part, composeBodyTransforms(transform, attachment), rotations, resolved);
  });
}

export function resolveBodyHierarchy(root:BodyPart, rootTransform:BodyPartTransform,
    rotations:BodyPartRotations = {}):readonly ResolvedBodyPart[] {
  const resolved:ResolvedBodyPart[] = [];
  _resolvePart(root, rootTransform, rotations, resolved);
  return resolved;
}

export function getResolvedBodyPart(parts:readonly ResolvedBodyPart[], kind:PartKind):ResolvedBodyPart {
  const resolved = parts.find(entry => entry.part.kind === kind);
  assertNonNullable(resolved);
  return resolved;
}

export function getBodyBounds(parts:readonly ResolvedBodyPart[]):Rect {
  assert(parts.length > 0, 'Body bounds require at least one resolved part.');
  const bounds = parts.map(({ part, transform }) =>
    transformBodyRect(transform, createRect(0, 0, part.width, part.height)));
  return bounds.slice(1).reduce(extendRectToContainRect, bounds[0]);
}