/* This module groups legacy standing, sitting, and kneeling skeleton geometry pending removal.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character from "@/game/types/Character";

const SITTING_BODY_LENGTH_SCALE = 0.7;
const SITTING_LEG_LENGTH_SCALE = 0.52;
const SITTING_TRAILING_LEG_LENGTH_SCALE = 0.32;
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

function _createSittingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const facingSign = facingDirection === 'right' ? 1 : -1;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const standingHeadCenterY = centerY - characterHeight / 4;
  const standingBodyTopY = standingHeadCenterY + headRadius;
  const hipY = centerY + characterHeight / 4;
  const standingShoulderY = centerY;
  const standingLeadingArmY = centerY + characterHeight / 8;
  const standingTrailingArmY = centerY + characterHeight / 16;
  const standingBodyLength = hipY - standingBodyTopY;
  const bodyLength = standingBodyLength * SITTING_BODY_LENGTH_SCALE;
  const bodyTopY = hipY - bodyLength;
  const shoulderOffsetRatio = (standingShoulderY - standingBodyTopY) / standingBodyLength;
  const leadingArmOffsetRatio = (standingLeadingArmY - standingShoulderY) / standingBodyLength;
  const trailingArmOffsetRatio = (standingTrailingArmY - standingShoulderY) / standingBodyLength;
  const headCenterY = bodyTopY - headRadius;
  const shoulderY = bodyTopY + bodyLength * shoulderOffsetRatio;
  const leadingArmX = backboneX + facingSign * characterWidth / 2;
  const trailingArmX = backboneX - facingSign * characterWidth / 4;
  const leadingArmY = shoulderY + bodyLength * leadingArmOffsetRatio;
  const trailingArmY = shoulderY + bodyLength * trailingArmOffsetRatio;
  const footY = centerY + characterHeight / 2;
  const leadingFootX = backboneX + facingSign * characterWidth * SITTING_LEG_LENGTH_SCALE;
  const trailingFootX = backboneX + facingSign * characterWidth * SITTING_TRAILING_LEG_LENGTH_SCALE;
  const trailingHand = { x:trailingArmX, y:trailingArmY };
  const leadingHand = { x:leadingArmX, y:leadingArmY };

  return _createLayoutWithHands(
    { centerX:backboneX, centerY:headCenterY, radius:headRadius },
    [
      { fromX:backboneX, fromY:headCenterY + headRadius, toX:backboneX, toY:hipY },
      { fromX:backboneX, fromY:shoulderY, toX:trailingArmX, toY:trailingArmY },
      { fromX:backboneX, fromY:shoulderY, toX:leadingArmX, toY:leadingArmY },
      { fromX:backboneX, fromY:hipY, toX:backboneX, toY:footY },
      { fromX:backboneX, fromY:footY, toX:trailingFootX, toY:footY },
      { fromX:backboneX, fromY:footY, toX:leadingFootX, toY:footY }
    ],
    facingDirection === 'right' ? trailingHand : leadingHand,
    facingDirection === 'right' ? leadingHand : trailingHand
  );
}

function _createKneelingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const layout = _createSittingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  const facingSign = facingDirection === 'right' ? 1 : -1;
  return _createLayoutWithHands(layout.head, layout.segments.map((segment, index) => {
    if (index < 4) return segment;
    return { ...segment, toX:backboneX - facingSign * Math.abs(segment.toX - backboneX) };
  }), layout.leftHand, layout.rightHand);
}

export function createCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection'], bodyOrientation:Character['bodyOrientation']):CharacterLayout {
  if (bodyOrientation === 'kneeling') return _createKneelingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  if (bodyOrientation === 'sitting') return _createSittingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  return _createStandingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
}
