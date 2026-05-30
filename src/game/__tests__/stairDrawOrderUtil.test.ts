import { describe, expect, it } from 'vitest';

import { calcStairPartDrawPhase, compareCharacterToStairPartRows, quantizeDepthToDrawRow } from '../stairDrawOrderUtil';
import StairPart, { StairPartType } from '../types/StairPart';

function _createFlight(startX:number, endX:number, z:number):StairPart {
  return {
    type:StairPartType.flight,
    startPosition:{ x:startX, y:20, z:0 },
    endPosition:{ x:endX, y:10, z:0 },
    z
  };
}

function _createLanding(z:number):StairPart {
  return {
    type:StairPartType.landing,
    leftX:0,
    topY:10,
    width:10,
    height:1,
    z,
    depth:0.6667
  };
}

describe('stairDrawOrderUtil', () => {
  describe('quantizeDepthToDrawRow()', () => {
    it('maps stair and character depths into shared back, middle, and front rows', () => {
      expect(quantizeDepthToDrawRow(0)).toBe(0);
      expect(quantizeDepthToDrawRow(0.3333)).toBe(1);
      expect(quantizeDepthToDrawRow(0.5)).toBe(1);
      expect(quantizeDepthToDrawRow(0.6667)).toBe(2);
      expect(quantizeDepthToDrawRow(1)).toBe(2);
    });
  });

  describe('compareCharacterToStairPartRows()', () => {
    it('draws flights after characters in smaller rows', () => {
      expect(compareCharacterToStairPartRows(0.1667, _createFlight(4, 8, 0.6667))).toBeLessThan(0);
    });

    it('draws right-ascending flights before same-row characters', () => {
      expect(compareCharacterToStairPartRows(0.5, _createFlight(4, 8, 0.3333))).toBeGreaterThan(0);
    });

    it('draws left-ascending flights after same-row characters', () => {
      expect(compareCharacterToStairPartRows(0.5, _createFlight(8, 4, 0.3333))).toBeLessThan(0);
    });

    it('leaves same-row non-flight stair parts to the default depth sort', () => {
      expect(compareCharacterToStairPartRows(0.5, _createLanding(0.3333))).toBe(0);
    });
  });

  describe('calcStairPartDrawPhase()', () => {
    it('orders right-ascending flights before default content and left-ascending flights after it', () => {
      expect(calcStairPartDrawPhase(_createFlight(4, 8, 0.3333))).toBeLessThan(calcStairPartDrawPhase(_createLanding(0.3333)));
      expect(calcStairPartDrawPhase(_createFlight(8, 4, 0.3333))).toBeGreaterThan(calcStairPartDrawPhase(_createLanding(0.3333)));
    });
  });
});