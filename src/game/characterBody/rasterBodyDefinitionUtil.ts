/* This file converts complete source-pixel anatomy into uniformly scaled game-unit body definitions.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import { MAP_TILE_SIZE } from '../roomGridUtil';
import Point from '../types/Point';
import BodyPart from './types/BodyPart';
import PartKind from './types/PartKind';
import RasterBodyDefinition from './types/RasterBodyDefinition';
import { getBodyBounds, resolveBodyHierarchy } from './characterBodyPoseUtil';

const DEFAULT_BODY_HEIGHT = MAP_TILE_SIZE * 0.4;
const CHILD_KINDS = ['head', 'farArm', 'nearArm', 'leftLeg', 'rightLeg'] as const;

function _createPart(definition:RasterBodyDefinition, kind:PartKind):BodyPart {
  const geometry = definition.parts[kind];
  const isArm = kind === 'farArm' || kind === 'nearArm';
  return {
    ...geometry, kind, connectedParts:[],
    handPoint:isArm ? [geometry.width * 0.75, geometry.height] : null
  };
}

function _scalePoint(point:Point, scale:number):Point {
  return [point[0] * scale, point[1] * scale];
}

function _scalePart(part:BodyPart, scale:number):BodyPart {
  return {
    ...part, width:part.width * scale, height:part.height * scale,
    pivotPoint:_scalePoint(part.pivotPoint, scale),
    handPoint:part.handPoint ? _scalePoint(part.handPoint, scale) : null,
    connectedParts:part.connectedParts.map(({ part:child, connectionPoint }) => ({
      part:_scalePart(child, scale), connectionPoint:_scalePoint(connectionPoint, scale)
    }))
  };
}

/** Scales validated six-part anatomy to a standing rest height without posing, I/O, or input mutation. */
export function createRasterCharacterBody(definition:RasterBodyDefinition, targetHeight:number = DEFAULT_BODY_HEIGHT):BodyPart {
  assert(Number.isFinite(targetHeight) && targetHeight > 0);
  const root:BodyPart = {
    ..._createPart(definition, 'torso'),
    connectedParts:CHILD_KINDS.map(kind => ({
      part:_createPart(definition, kind), connectionPoint:definition.connections[kind]
    }))
  };

  const bounds = getBodyBounds(resolveBodyHierarchy(root, {
    horizontalX:1, horizontalY:0, verticalX:0, verticalY:1, translateX:0, translateY:0
  }));
  assert(Number.isFinite(bounds.height) && bounds.height > 0);
  return _scalePart(root, targetHeight / bounds.height);
}