/* This file defines the shared default character body in game-unit local coordinates.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { MAP_TILE_SIZE } from '../roomGridUtil';
import BodyPart from './types/BodyPart';

const BODY_HEIGHT = MAP_TILE_SIZE * 0.4;

function _createArm(kind:'leftArm'|'rightArm'):BodyPart {
  const width = BODY_HEIGHT * 0.2;
  const height = BODY_HEIGHT * 0.3;
  return { kind, width, height, pivotPoint:[width / 2, 0], connectedParts:[], handPoint:[width * 0.75, height] };
}

function _createLeg(kind:'leftLeg'|'rightLeg'):BodyPart {
  const width = BODY_HEIGHT * 0.15;
  const height = BODY_HEIGHT / 4;
  return { kind, width, height, pivotPoint:[width / 4, 0], connectedParts:[], handPoint:null };
}

function _createDefaultBody():BodyPart {
  const width = BODY_HEIGHT / 10;
  const height = BODY_HEIGHT * 3 / 8;
  const headSize = BODY_HEIGHT * 0.75;
  const head:BodyPart = {
    kind:'head', width:headSize, height:headSize,
    pivotPoint:[headSize / 2, headSize * 0.9], connectedParts:[], handPoint:null
  };
  return {
    kind:'torso', width, height, pivotPoint:[width / 2, height], handPoint:null,
    connectedParts:[
      { part:head, connectionPoint:[width / 2, 0] },
      { part:_createArm('leftArm'), connectionPoint:[0, height / 3] },
      { part:_createArm('rightArm'), connectionPoint:[width, height / 3] },
      { part:_createLeg('leftLeg'), connectionPoint:[width / 4, height] },
      { part:_createLeg('rightLeg'), connectionPoint:[width * 0.75, height] }
    ]
  };
}

const _defaultBody = _createDefaultBody();

export function createDefaultCharacterBody():BodyPart {
  return _defaultBody;
}