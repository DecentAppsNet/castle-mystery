import { describe, expect, it } from 'vitest';
import Conclusion from '@/game/conclusions/types/Conclusion';
import { areAllRequiredConclusionsComplete, countRemainingRequiredConclusions, countShameMarks } from '../conclusionUtil';

function _createConclusion(isComplete:boolean = false, isOptional:boolean = false, incorrectGuessCount:number = 0):Conclusion {
  return { id:'test', title:'Test', parts:[], isComplete, isOptional, incorrectGuessCount,
    isLocked:false, unlockConclusionIds:[], revealRoomIds:[] };
}

describe('conclusionUtil', () => {
  describe('countRemainingRequiredConclusions()', () => {
    it('counts no remaining conclusions in an empty chapter', () => {
      expect(countRemainingRequiredConclusions([])).toBe(0);
    });

    it('counts only incomplete required conclusions, including locked ones', () => {
      const locked = { ..._createConclusion(), isLocked:true };
      expect(countRemainingRequiredConclusions([_createConclusion(), locked,
        _createConclusion(true), _createConclusion(false, true), _createConclusion(true, true)])).toBe(2);
    });
  });

  describe('areAllRequiredConclusionsComplete()', () => {
    it('considers an empty chapter complete', () => {
      expect(areAllRequiredConclusionsComplete([])).toBe(true);
    });

    it('allows incomplete optional conclusions', () => {
      expect(areAllRequiredConclusionsComplete([_createConclusion(true), _createConclusion(false, true)])).toBe(true);
    });

    it('requires every required conclusion to be complete', () => {
      expect(areAllRequiredConclusionsComplete([_createConclusion(true), _createConclusion()])).toBe(false);
    });
  });

  describe('countShameMarks()', () => {
    it('counts no marks for an empty chapter or first failed claims', () => {
      expect(countShameMarks([])).toBe(0);
      expect(countShameMarks([_createConclusion(), _createConclusion(false, false, 1)])).toBe(0);
    });

    it('sums subsequent failed claims, including completed and optional conclusions', () => {
      expect(countShameMarks([_createConclusion(true, false, 2), _createConclusion(false, true, 4)])).toBe(4);
    });
  });
});