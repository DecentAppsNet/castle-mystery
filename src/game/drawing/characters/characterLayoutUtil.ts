/* This module groups legacy standing skeleton geometry pending removal.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "@/game/types/Character";

const STANDING_LEADING_ARM_HEIGHT_SCALE = 0.16;
const STANDING_TRAILING_ARM_HEIGHT_SCALE = 0.1;

type HeadLayout = {
  centerX:number,
  centerY:number,
  radius:number
}

type StrokeSegment = {
  fromX:number,
  fromY:number,
  toX:number,
  toY:number
}

type Point = {
  x:number,
  y:number
}

export type CharacterLayout = {
  head:HeadLayout,
  segments:StrokeSegment[],
  leftHand:Point,
  rightHand:Point,
  topY:number,
  bottomY:number
}

function _createLayoutWithHands(head:HeadLayout, segments:StrokeSegment[], leftHand:Point, rightHand:Point):CharacterLayout {
  const segmentYs = segments.flatMap(segment => [segment.fromY, segment.toY]);
  return {
    head,
    segments,
    leftHand,
    rightHand,
    topY:Math.min(head.centerY - head.radius, ...segmentYs),
    bottomY:Math.max(head.centerY + head.radius, ...segmentYs)
  };
}

function _createStandingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const facingSign = facingDirection === 'right' ? 1 : -1;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const headCenterY = centerY - characterHeight / 4;
  const shoulderY = centerY;
  const hipY = centerY + characterHeight / 4;
  const leadingArmX = backboneX + facingSign * characterWidth / 2;
  const trailingArmX = backboneX - facingSign * characterWidth / 4;
  const leadingArmY = centerY + characterHeight * STANDING_LEADING_ARM_HEIGHT_SCALE;
  const trailingArmY = centerY + characterHeight * STANDING_TRAILING_ARM_HEIGHT_SCALE;
  const leadingFootX = backboneX + facingSign * characterWidth / 2;
  const trailingFootX = backboneX - facingSign * characterWidth / 8;
  const footY = centerY + characterHeight / 2;
  const trailingHand = { x:trailingArmX, y:trailingArmY };
  const leadingHand = { x:leadingArmX, y:leadingArmY };

  return _createLayoutWithHands(
    { centerX:backboneX, centerY:headCenterY, radius:headRadius },
    [
      { fromX:backboneX, fromY:headCenterY + headRadius, toX:backboneX, toY:hipY },
      { fromX:backboneX, fromY:shoulderY, toX:trailingArmX, toY:trailingArmY },
      { fromX:backboneX, fromY:shoulderY, toX:leadingArmX, toY:leadingArmY },
      { fromX:backboneX, fromY:hipY, toX:trailingFootX, toY:footY },
      { fromX:backboneX, fromY:hipY, toX:leadingFootX, toY:footY }
    ],
    facingDirection === 'right' ? trailingHand : leadingHand,
    facingDirection === 'right' ? leadingHand : trailingHand
  );
}

export function createCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  return _createStandingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
}
