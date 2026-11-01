/* This file creates default character body definitions in game-unit local coordinates.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { MAP_TILE_SIZE } from '../roomGridUtil';
import BodyPart from './types/BodyPart';
import { getArmThickness } from './characterArmGeometryUtil';
import { assertNonNullable } from 'decent-portal';

const PLACEHOLDER_TILE_SIZE_RATIO = 0.4;
const PLACEHOLDER_PROPORTION_SCALE = MAP_TILE_SIZE * PLACEHOLDER_TILE_SIZE_RATIO;
const HEAD_TORSO_WIDTH_RATIO = 2;
const CENTER_DIVISOR = 2;
const ARM_WIDTH_RATIO = 0.2;
const ARM_HEIGHT_RATIO = 0.3;
const HAND_X_WIDTH_RATIO = 0.75;
const LEG_WIDTH_RATIO = 0.15;
const LEG_HEIGHT_DIVISOR = 4;
const LEG_PIVOT_X_DIVISOR = 4;
const TORSO_WIDTH_DIVISOR = 3;
const TORSO_HEIGHT_RATIO = 3 / 8;
const HEAD_PIVOT_Y_RATIO = 0.9;
const HEAD_CONNECTION_Y_RATIO = 0.3;
const SHOULDER_X_INSET_RATIO = 0.2;
const SHOULDER_Y_RATIO = 0.2;
const LEFT_HIP_X_DIVISOR = 4;
const RIGHT_HIP_X_RATIO = 0.75;
const HIP_Y_RATIO = 0.8;

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

/** Creates an attachment-only node with its pivot at the local item-center origin. */
export function createHandBodyPart(kind:'nearHand'|'farHand'):BodyPart {
  return { kind, imageUrl:null, width:0, height:0, pivotPoint:[0, 0], connectedParts:[], handPoint:null };
}

function _createArm(kind:'farArm'|'nearArm'):BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE * ARM_WIDTH_RATIO;
  const height = PLACEHOLDER_PROPORTION_SCALE * ARM_HEIGHT_RATIO;
  const shoulderCenter = getArmThickness(width, height) / CENTER_DIVISOR;
  const handPoint:BodyPart['handPoint'] = [width * HAND_X_WIDTH_RATIO, height];
  return { kind, imageUrl:null, width, height, pivotPoint:[shoulderCenter, shoulderCenter], handPoint,
    connectedParts:[{ part:createHandBodyPart(kind === 'nearArm' ? 'nearHand' : 'farHand'), connectionPoint:handPoint }] };
}

function _createLeg(kind:'leftLeg'|'rightLeg'):BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE * LEG_WIDTH_RATIO;
  const height = PLACEHOLDER_PROPORTION_SCALE / LEG_HEIGHT_DIVISOR;
  return { kind, imageUrl:null, width, height, pivotPoint:[width / LEG_PIVOT_X_DIVISOR, 0], connectedParts:[], handPoint:null };
}

/** Creates a readonly torso-root definition in game units; callers must not mutate it. */
export function createDefaultCharacterBody():BodyPart {
  const width = PLACEHOLDER_PROPORTION_SCALE / TORSO_WIDTH_DIVISOR;
  const height = PLACEHOLDER_PROPORTION_SCALE * TORSO_HEIGHT_RATIO;
  const headSize = width * HEAD_TORSO_WIDTH_RATIO;
  const head:BodyPart = {
    kind:'head', imageUrl:null, width:headSize, height:headSize,
    pivotPoint:[headSize / CENTER_DIVISOR, headSize * HEAD_PIVOT_Y_RATIO], connectedParts:[], handPoint:null
  };
  return {
    kind:'torso', imageUrl:null, width, height, pivotPoint:[width / CENTER_DIVISOR, height], handPoint:null,
    connectedParts:[
      { part:head, connectionPoint:[width / CENTER_DIVISOR, height * HEAD_CONNECTION_Y_RATIO] },
      { part:_createArm('farArm'), connectionPoint:[width * SHOULDER_X_INSET_RATIO, height * SHOULDER_Y_RATIO] },
      { part:_createArm('nearArm'), connectionPoint:[width - width * SHOULDER_X_INSET_RATIO, height * SHOULDER_Y_RATIO] },
      { part:_createLeg('leftLeg'), connectionPoint:[width / LEFT_HIP_X_DIVISOR, height * HIP_Y_RATIO] },
      { part:_createLeg('rightLeg'), connectionPoint:[width * RIGHT_HIP_X_RATIO, height * HIP_Y_RATIO] }
    ]
  };
}