/* This module groups stair-versus-character draw-order helpers derived from stair geometry and depth rows.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import StairPart, { StairLandingType, StairPartType } from "./types/StairPart";
import { STAIR_POSITION_TOLERANCE } from "./stairUtil";
import { ROOM_FRONT_ROW_MIN_Z, ROOM_MIDDLE_ROW_MIN_Z } from "./roomSpaceConstants";

const DRAW_ROW_EPSILON = 0.001;
const MIDDLE_DRAW_ROW = 1;
const RIGHT_ASCENDING_FLIGHT_PHASE = 0;
const DEFAULT_DRAW_PHASE = 1;
const LEFT_ASCENDING_FLIGHT_PHASE = 2;

export function quantizeDepthToDrawRow(z:number):number {
  if (z < ROOM_MIDDLE_ROW_MIN_Z - DRAW_ROW_EPSILON) return 0;
  if (z < ROOM_FRONT_ROW_MIN_Z - DRAW_ROW_EPSILON) return 1;
  return 2;
}

function _isRightAscendingFlight(stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.flight && stairPart.endPosition.x > stairPart.startPosition.x;
}

export function calcStairPartDrawPhase(stairPart:StairPart):number {
  if (stairPart.type !== StairPartType.flight) return DEFAULT_DRAW_PHASE;
  return _isRightAscendingFlight(stairPart) ? RIGHT_ASCENDING_FLIGHT_PHASE : LEFT_ASCENDING_FLIGHT_PHASE;
}

export function calcStairPartDrawRow(stairPart:StairPart):number {
  if (stairPart.type === StairPartType.catwalk) return MIDDLE_DRAW_ROW;
  return quantizeDepthToDrawRow(stairPart.z);
}

function _isCharacterWithinPartYBounds(characterY:number, topY:number, height:number):boolean {
  return characterY >= topY - STAIR_POSITION_TOLERANCE
    && characterY <= topY + height + STAIR_POSITION_TOLERANCE;
}

function _isCharacterWithinCatwalkYBounds(characterY:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.catwalk
    && _isCharacterWithinPartYBounds(characterY, stairPart.topY, stairPart.height);
}

function _isCharacterWithinLandingYBounds(characterY:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.landing
    && _isCharacterWithinPartYBounds(characterY, stairPart.topY, stairPart.height);
}

function _isCharacterAtFlightLandingY(characterY:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.flight
    && Math.abs(characterY - stairPart.endPosition.y) <= STAIR_POSITION_TOLERANCE;
}

function _isCharacterOnFlight(characterX:number, characterY:number, stairPart:StairPart):boolean {
  if (stairPart.type !== StairPartType.flight) return false;

  const minX = Math.min(stairPart.startPosition.x, stairPart.endPosition.x) - STAIR_POSITION_TOLERANCE;
  const maxX = Math.max(stairPart.startPosition.x, stairPart.endPosition.x) + STAIR_POSITION_TOLERANCE;
  const minY = Math.min(stairPart.startPosition.y, stairPart.endPosition.y) - STAIR_POSITION_TOLERANCE;
  const maxY = Math.max(stairPart.startPosition.y, stairPart.endPosition.y) + STAIR_POSITION_TOLERANCE;
  return characterX >= minX && characterX <= maxX && characterY >= minY && characterY <= maxY;
}

function _isCharacterAtDirectLandingY(characterY:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.landing
    && (stairPart.landingType === StairLandingType.directLeft || stairPart.landingType === StairLandingType.directRight)
    && _isCharacterWithinLandingYBounds(characterY, stairPart);
}

function _isCharacterAtFullStoryLandingY(characterY:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.landing
    && stairPart.landingType === StairLandingType.fullStory
    && _isCharacterWithinLandingYBounds(characterY, stairPart);
}

function _isBackRowCharacterWithinWindingStoryLanding(characterY:number, characterDepth:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.landing
    && stairPart.landingType === StairLandingType.terminalStory
    && quantizeDepthToDrawRow(characterDepth) === 0
    && _isCharacterWithinLandingYBounds(characterY, stairPart);
}

function _isBackRowCharacterWithinMiddleRowCatwalk(characterY:number, characterDepth:number, stairPart:StairPart):boolean {
  return stairPart.type === StairPartType.catwalk
    && quantizeDepthToDrawRow(characterDepth) === 0
    && quantizeDepthToDrawRow(stairPart.z) === 1
    && _isCharacterWithinCatwalkYBounds(characterY, stairPart);
}

// Compares a character against one stair part for draw order.
//
// Return value contract:
// - `< 0`: draw the character before the stair part.
// - `> 0`: draw the stair part before the character.
// - `0`: this helper has no stair-specific override, so the caller should fall back
//   to the default depth/x ordering for mixed room contents.
//
// Most stair-vs-character cases are resolved by shared draw rows derived from z/depth,
// but this helper also applies the hard-earned stair-specific exceptions that the plain
// row sort cannot express on its own:
// - landings or catwalks can force themselves ahead once the character is within their
//   vertical band
// - flights can force themselves ahead once the character reaches the landing y
// - unrelated flights should not affect same-row left/right ordering, so they stay on
//   the stair-before-character side instead of participating in flight phase ordering
export function compareCharacterToStairPartRows(characterX:number, characterY:number, characterDepth:number, stairPart:StairPart):number {
  if (_isCharacterAtDirectLandingY(characterY, stairPart)) return 1;
  if (_isCharacterAtFullStoryLandingY(characterY, stairPart)) return 1;
  if (_isBackRowCharacterWithinWindingStoryLanding(characterY, characterDepth, stairPart)) return 1;
  if (_isBackRowCharacterWithinMiddleRowCatwalk(characterY, characterDepth, stairPart)) return 1;
  if (_isCharacterAtFlightLandingY(characterY, stairPart)) return 1;
  if (stairPart.type === StairPartType.flight && !_isCharacterOnFlight(characterX, characterY, stairPart)
    && quantizeDepthToDrawRow(characterDepth) === calcStairPartDrawRow(stairPart)) return 1;

  const characterRow = quantizeDepthToDrawRow(characterDepth);
  const stairRow = calcStairPartDrawRow(stairPart);
  if (characterRow !== stairRow) return characterRow - stairRow;
  return DEFAULT_DRAW_PHASE - calcStairPartDrawPhase(stairPart);
}