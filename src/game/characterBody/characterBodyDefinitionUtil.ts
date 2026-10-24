/* This file creates default character body definitions in game-unit local coordinates.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { MAP_TILE_SIZE } from '../roomGridUtil';
import BodyPart from './types/BodyPart';
import { getArmThickness } from './characterArmGeometryUtil';

const BODY_HEIGHT = MAP_TILE_SIZE * 0.4;
const HEAD_TORSO_WIDTH_RATIO = 2;

function _createArm(kind:'leftArm'|'rightArm'):BodyPart {
  const width = BODY_HEIGHT * 0.2;
  const height = BODY_HEIGHT * 0.3;
  const shoulderCenter = getArmThickness(width, height) / 2;
  return { kind, width, height, pivotPoint:[shoulderCenter, shoulderCenter], connectedParts:[], handPoint:[width * 0.75, height] };
}

function _createLeg(kind:'leftLeg'|'rightLeg'):BodyPart {
  const width = BODY_HEIGHT * 0.15;
  const height = BODY_HEIGHT / 4;
  return { kind, width, height, pivotPoint:[width / 4, 0], connectedParts:[], handPoint:null };
}

/** Creates a readonly torso-root definition in game units; callers must not mutate it. */
export function createDefaultCharacterBody():BodyPart {
  const width = BODY_HEIGHT / 3;
  const height = BODY_HEIGHT * 3 / 8;
  const headSize = width * HEAD_TORSO_WIDTH_RATIO;
  const head:BodyPart = {
    kind:'head', width:headSize, height:headSize,
    pivotPoint:[headSize / 2, headSize * 0.9], connectedParts:[], handPoint:null
  };
  return {
    kind:'torso', width, height, pivotPoint:[width / 2, height], handPoint:null,
    connectedParts:[
      { part:head, connectionPoint:[width / 2, 0 /* + height * .3 */] },
      { part:_createArm('leftArm'), connectionPoint:[0 + (width * .2), 0 + (height * .2)] },
      { part:_createArm('rightArm'), connectionPoint:[width - (width * .2), 0 + (height * .2)] },
      { part:_createLeg('leftLeg'), connectionPoint:[width / 4, height * .8] },
      { part:_createLeg('rightLeg'), connectionPoint:[width * 0.75, height * .8] }
    ]
  };
}