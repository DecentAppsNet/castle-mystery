import StairPart, { StairPartType } from "./types/StairPart";

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

export function compareCharacterToStairPartRows(characterDepth:number, stairPart:StairPart):number {
  const characterRow = quantizeDepthToDrawRow(characterDepth);
  const stairRow = calcStairPartDrawRow(stairPart);
  if (characterRow !== stairRow) return characterRow - stairRow;
  return DEFAULT_DRAW_PHASE - calcStairPartDrawPhase(stairPart);
}