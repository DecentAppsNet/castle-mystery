import { describe, expect, it } from 'vitest';

import { ROOM_BACK_ROW_CENTER_Z, ROOM_BACK_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_FRONT_ROW_MIN_Z, ROOM_FULL_DEPTH, ROOM_MIDDLE_ROW_CENTER_Z, ROOM_MIDDLE_ROW_MIN_Z, ROOM_ROW_DEPTH } from '../roomSpaceConstants';
import { calcStairPartDrawPhase, calcStairPartDrawRow, compareCharacterToStairPartRows, quantizeDepthToDrawRow } from '../stairDrawOrderUtil';
import StairPart, { StairLandingType, StairPartType } from '../types/StairPart';

const BACK_ROW_Z = ROOM_BACK_Z;
const BACK_ROW_CHARACTER_DEPTH = ROOM_BACK_ROW_CENTER_Z;
const MIDDLE_ROW_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;
const FRONT_ROW_DEPTH = ROOM_FRONT_ROW_CENTER_Z;
const MIDDLE_ROW_Z = ROOM_MIDDLE_ROW_MIN_Z;
const FRONT_ROW_Z = ROOM_FRONT_ROW_MIN_Z;
const CATWALK_DEPTH = ROOM_ROW_DEPTH;
const LANDING_DEPTH = ROOM_FRONT_ROW_MIN_Z;
const FULL_DEPTH = ROOM_FULL_DEPTH;

function _createFlight(startX:number, endX:number, z:number):StairPart {
  return {
    type:StairPartType.flight,
    startPosition:{ x:startX, y:20, z:BACK_ROW_Z },
    endPosition:{ x:endX, y:10, z:BACK_ROW_Z },
    z
  };
}

function _createLanding(z:number, depth:number = LANDING_DEPTH, landingType:StairLandingType = StairLandingType.directLeft):StairPart {
  return {
    type:StairPartType.landing,
    landingType,
    leftX:0,
    topY:10,
    width:10,
    height:1,
    z,
    depth
  };
}

function _createCatwalk(z:number):StairPart {
  return {
    type:StairPartType.catwalk,
    leftX:0,
    topY:10,
    width:10,
    height:1,
    z,
    depth:CATWALK_DEPTH
  };
}

describe('stairDrawOrderUtil', () => {
  describe('quantizeDepthToDrawRow()', () => {
    it('maps stair and character depths into shared back, middle, and front rows', () => {
      expect(quantizeDepthToDrawRow(0)).toBe(0);
      expect(quantizeDepthToDrawRow(MIDDLE_ROW_Z)).toBe(1);
      expect(quantizeDepthToDrawRow(MIDDLE_ROW_DEPTH)).toBe(1);
      expect(quantizeDepthToDrawRow(FRONT_ROW_Z)).toBe(2);
      expect(quantizeDepthToDrawRow(FULL_DEPTH)).toBe(2);
    });
  });

  describe('compareCharacterToStairPartRows()', () => {
    it('draws flights after characters in smaller rows', () => {
      expect(compareCharacterToStairPartRows(6, 15, BACK_ROW_CHARACTER_DEPTH, _createFlight(4, 8, FRONT_ROW_Z))).toBeLessThan(0);
    });

    it('draws right-ascending flights before same-row characters', () => {
      expect(compareCharacterToStairPartRows(6, 15, MIDDLE_ROW_DEPTH, _createFlight(4, 8, MIDDLE_ROW_Z))).toBeGreaterThan(0);
    });

    it('draws left-ascending flights after same-row characters', () => {
      expect(compareCharacterToStairPartRows(6, 15, MIDDLE_ROW_DEPTH, _createFlight(8, 4, MIDDLE_ROW_Z))).toBeLessThan(0);
    });

    it('leaves same-row non-flight stair parts to the default depth sort', () => {
      expect(compareCharacterToStairPartRows(6, 15, MIDDLE_ROW_DEPTH, _createLanding(MIDDLE_ROW_Z))).toBe(0);
    });

    it('draws catwalks before front-row characters even when the authored catwalk z is back-row', () => {
      expect(compareCharacterToStairPartRows(6, 15, FRONT_ROW_DEPTH, _createCatwalk(BACK_ROW_Z))).toBeGreaterThan(0);
    });

    it('draws a middle-row catwalk before a back-row character while the character is within the catwalk band', () => {
      expect(compareCharacterToStairPartRows(6, 10.5, BACK_ROW_CHARACTER_DEPTH, _createCatwalk(MIDDLE_ROW_Z))).toBeGreaterThan(0);
    });

    it('draws a left-ascending flight before the character once the character has reached the landing y', () => {
      expect(compareCharacterToStairPartRows(4, 10, MIDDLE_ROW_DEPTH, _createFlight(8, 4, MIDDLE_ROW_Z))).toBeGreaterThan(0);
    });

    it('draws a direct back-row landing before the character once the character has reached that landing y', () => {
      expect(compareCharacterToStairPartRows(6, 10, BACK_ROW_CHARACTER_DEPTH, _createLanding(BACK_ROW_Z))).toBeGreaterThan(0);
    });

    it('draws a full-story winding landing before a back-row character while the character is within the landing band', () => {
      expect(compareCharacterToStairPartRows(6, 10.5, BACK_ROW_CHARACTER_DEPTH,
        _createLanding(BACK_ROW_Z, FULL_DEPTH, StairLandingType.fullStory))).toBeGreaterThan(0);
    });

    it('draws a middle-row winding story landing before a back-row character while the character is within the landing band', () => {
      expect(compareCharacterToStairPartRows(6, 10.5, BACK_ROW_CHARACTER_DEPTH,
        _createLanding(MIDDLE_ROW_Z, LANDING_DEPTH, StairLandingType.terminalStory))).toBeGreaterThan(0);
    });

    it('draws unrelated flights before the character instead of letting them decide same-row left/right ordering', () => {
      expect(compareCharacterToStairPartRows(20, 15, MIDDLE_ROW_DEPTH, _createFlight(4, 8, MIDDLE_ROW_Z))).toBeGreaterThan(0);
    });
  });

  describe('calcStairPartDrawPhase()', () => {
    it('orders right-ascending flights before default content and left-ascending flights after it', () => {
      expect(calcStairPartDrawPhase(_createFlight(4, 8, MIDDLE_ROW_Z))).toBeLessThan(calcStairPartDrawPhase(_createLanding(MIDDLE_ROW_Z)));
      expect(calcStairPartDrawPhase(_createFlight(8, 4, MIDDLE_ROW_Z))).toBeGreaterThan(calcStairPartDrawPhase(_createLanding(MIDDLE_ROW_Z)));
    });
  });

  describe('calcStairPartDrawRow()', () => {
    it('treats catwalks as middle-row for draw ordering regardless of their authored z', () => {
      expect(calcStairPartDrawRow(_createCatwalk(BACK_ROW_Z))).toBe(1);
      expect(calcStairPartDrawRow(_createCatwalk(MIDDLE_ROW_Z))).toBe(1);
    });

    it('still treats direct back-row landings as back-row for row comparisons', () => {
      expect(calcStairPartDrawRow(_createLanding(BACK_ROW_Z))).toBe(0);
      expect(calcStairPartDrawRow(_createLanding(BACK_ROW_Z, FULL_DEPTH, StairLandingType.fullStory))).toBe(0);
    });
  });
});