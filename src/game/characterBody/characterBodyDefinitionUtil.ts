/* This file creates default character body definitions in game-unit local coordinates.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { MAP_TILE_SIZE } from '../roomGridUtil';
import BodyPart from './types/BodyPart';
import { getArmThickness } from './characterArmGeometryUtil';
import { assertNonNullable } from 'decent-portal';

const PLACEHOLDER_PROPORTION_SCALE = MAP_TILE_SIZE * 0.4;
const HEAD_TORSO_WIDTH_RATIO = 2;

/** Returns the head image of a torso-root definition; the head must be a direct child. */
export function getHeadImageUrl(root:BodyPart):string|null {
  const head = root.connectedParts.find(({ part }) => part.kind === 'head');
  assertNonNullable(head);
  return head.part.imageUrl;
}

/**
 * Returns a body tree with the head image replaced, preserving all geometry and leaving the input unchanged.
 * Shares unaffected parts and connections; returns the original root if no image changes, including when no head exists.
 * A null URL clears the head image. This only changes the reference; it does not load or validate the asset.
 */
export function replaceHeadImage(root:BodyPart, imageUrl:string|null):BodyPart {
  if (root.kind === 'head') return root.imageUrl === imageUrl ? root : { ...root, imageUrl };
  const connectedParts = root.connectedParts.map(connection => {
    const part = replaceHeadImage(connection.part, imageUrl);
    return part === connection.part ? connection : { ...connection, part };
  });
  return connectedParts.every((connection, index) => connection === root.connectedParts[index])
    ? root : { ...root, connectedParts };
}

function _createArm(kind:'leftArm'|'rightArm'):BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE * 0.2;
  const height = PLACEHOLDER_PROPORTION_SCALE * 0.3;
  const shoulderCenter = getArmThickness(width, height) / 2;
  return { kind, imageUrl:null, width, height, pivotPoint:[shoulderCenter, shoulderCenter], connectedParts:[], handPoint:[width * 0.75, height] };
}

function _createLeg(kind:'leftLeg'|'rightLeg'):BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE * 0.15;
  const height = PLACEHOLDER_PROPORTION_SCALE / 4;
  return { kind, imageUrl:null, width, height, pivotPoint:[width / 4, 0], connectedParts:[], handPoint:null };
}

/** Creates a readonly torso-root definition in game units; callers must not mutate it. */
export function createDefaultCharacterBody():BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE / 3;
  const height = PLACEHOLDER_PROPORTION_SCALE * 3 / 8;
  const headSize = width * HEAD_TORSO_WIDTH_RATIO;
  const head:BodyPart = {
    kind:'head', imageUrl:null, width:headSize, height:headSize,
    pivotPoint:[headSize / 2, headSize * 0.9], connectedParts:[], handPoint:null
  };
  return {
    kind:'torso', imageUrl:null, width, height, pivotPoint:[width / 2, height], handPoint:null,
    connectedParts:[
      { part:head, connectionPoint:[width / 2, 0 + height * .3] },
      { part:_createArm('leftArm'), connectionPoint:[0 + (width * .2), 0 + (height * .2)] },
      { part:_createArm('rightArm'), connectionPoint:[width - (width * .2), 0 + (height * .2)] },
      { part:_createLeg('leftLeg'), connectionPoint:[width / 4, height * .8] },
      { part:_createLeg('rightLeg'), connectionPoint:[width * 0.75, height * .8] }
    ]
  };
}