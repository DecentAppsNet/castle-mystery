import StairPart, { StairPartType } from "./types/StairPart";
import { STAIR_POSITION_TOLERANCE } from "./stairUtil";

const DRAW_ROW_EPSILON = 0.001;
const MIDDLE_DRAW_ROW = 1;
const RIGHT_ASCENDING_FLIGHT_PHASE = 0;
const DEFAULT_DRAW_PHASE = 1;
const LEFT_ASCENDING_FLIGHT_PHASE = 2;

export function quantizeDepthToDrawRow(z:number):number {
  if (z < 1 / 3 - DRAW_ROW_EPSILON) return 0;
  if (z < 2 / 3 - DRAW_ROW_EPSILON) return 1;
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
    && stairPart.depth < 1 - STAIR_POSITION_TOLERANCE
    && quantizeDepthToDrawRow(stairPart.z) === 0
    && Math.abs(characterY - stairPart.topY) <= STAIR_POSITION_TOLERANCE;
}

export function compareCharacterToStairPartRows(characterX:number, characterY:number, characterDepth:number, stairPart:StairPart):number {
  if (_isCharacterAtDirectLandingY(characterY, stairPart)) return 1;
  if (_isCharacterAtFlightLandingY(characterY, stairPart)) return 1;
  if (stairPart.type === StairPartType.flight && !_isCharacterOnFlight(characterX, characterY, stairPart)) return 1;

  const characterRow = quantizeDepthToDrawRow(characterDepth);
  const stairRow = calcStairPartDrawRow(stairPart);
  if (characterRow !== stairRow) return characterRow - stairRow;
  return DEFAULT_DRAW_PHASE - calcStairPartDrawPhase(stairPart);
}