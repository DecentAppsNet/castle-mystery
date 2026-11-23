import { describe, expect, it } from 'vitest';
import { createAnswerSet } from '@/game/conclusions/answerSetUtil';
import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import { calcBookClaimMessageAlpha, prepareBookClaimGlints } from '../bookClaimPresentationUtil';
import { FULL_REVOLUTION_RADIANS } from '../bookClaimTimingUtil';
import BookClaimState from '../types/BookClaimState';
import BookPage from '@/book/types/BookPage';
import { createDefaultBookState } from '@/book/types/BookState';

const STARTED_AT = 12000;
const TWELVE_OCLOCK_RADIANS = Math.PI / 2;

function _createClaim(count:number = 2, correct:boolean = true):BookClaimState {
  const answerSet = createAnswerSet(['Answer'], 'people');
  const blanks:ClozeBlank[] = Array.from({ length:count }, () => ({
    type:'blank', answerSet, correctAnswerIndexes:[0], playerAnswerIndex:0
  }));
  const page:Extract<BookPage, { kind:'conclusion' }> = {
    kind:'conclusion', headingText:'', chapterNo:1, answerSetIdToPieceStyleNoMap:{ people:3 },
    conclusion:{ id:'presentation', title:'Presentation', parts:blanks.flatMap(blank => [
      { type:'text' as const, text:' then ' }, blank
    ]), isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[] }
  };
  return { page, conclusionPageI:0, blanks, startedAt:STARTED_AT, correct, resultApplied:false, ejectedCount:0 };
}

describe('bookClaimPresentationUtil', () => {
  describe('calcBookClaimMessageAlpha()', () => {
    it('leaves idle and unrelated page messages fully opaque', () => {
      const state = createDefaultBookState();
      const claim = _createClaim();
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT)).toBe(1);
      state.claimState = claim;
      expect(calcBookClaimMessageAlpha(state, _createClaim().page, STARTED_AT + 1500)).toBe(1);
    });

    it('fades out with darkening and stays hidden through success and recovery', () => {
      const state = createDefaultBookState();
      const claim = _createClaim();
      state.claimState = claim;
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT - 1)).toBe(1);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT)).toBe(1);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 500)).toBe(.5);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 1000)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 3250)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 5750)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 6000)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 6500)).toBe(.5);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 7000)).toBe(1);
    });

    it('keeps the failure message hidden until recovery ends, including capped schedules', () => {
      const state = createDefaultBookState();
      const claim = _createClaim(10, false);
      state.claimState = claim;
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 6000)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 8750)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 9000)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 9500)).toBe(.5);
      expect(calcBookClaimMessageAlpha(state, claim.page, STARTED_AT + 10000)).toBe(1);
    });

    it('samples the final claim stage without mutation or accumulated frame deltas', () => {
      const state = createDefaultBookState();
      const claim = _createClaim();
      const page = claim.page;
      state.claimState = claim;
      const before = structuredClone(state);
      expect(calcBookClaimMessageAlpha(state, page, STARTED_AT + 6000)).toBe(0);
      expect(calcBookClaimMessageAlpha(state, page, STARTED_AT + 6500)).toBe(.5);
      expect(calcBookClaimMessageAlpha(state, page, STARTED_AT + 100000)).toBe(1);
      expect(calcBookClaimMessageAlpha(state, page, STARTED_AT + 6250)).toBe(.25);
      expect(calcBookClaimMessageAlpha(state, _createClaim().page, STARTED_AT + 6250)).toBe(1);
      expect(state).toEqual(before);
    });
  });

  describe('prepareBookClaimGlints()', () => {
    it('returns no glints without an accepted claim', () => {
      expect(prepareBookClaimGlints(null, STARTED_AT + 1500)).toEqual([]);
    });

    it('returns no glints before inspection, including out-of-order prestart samples', () => {
      const claim = _createClaim();
      expect(prepareBookClaimGlints(claim, STARTED_AT - 1)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 999)).toEqual([]);
    });

    it('retains actual claimed page and blank identities, not structurally equal neighbors', () => {
      const claim = _createClaim();
      const neighbor = _createClaim();
      const glints = prepareBookClaimGlints(claim, STARTED_AT + 1000);
      expect(glints).toHaveLength(1);
      expect(glints[0].page).toBe(claim.page);
      expect(glints[0].blank).toBe(claim.blanks[0]);
      expect(glints[0].page).not.toBe(neighbor.page);
      expect(glints[0].blank).not.toBe(neighbor.blanks[0]);
    });

    it('switches at the exact boundary in captured blank order despite intervening text', () => {
      const claim = _createClaim();
      expect(prepareBookClaimGlints(claim, STARTED_AT + 1999)[0].blank).toBe(claim.blanks[0]);
      const switched = prepareBookClaimGlints(claim, STARTED_AT + 2000);
      expect(switched).toHaveLength(1);
      expect(switched[0].blank).toBe(claim.blanks[1]);
      expect(switched[0].angle).toBeCloseTo(TWELVE_OCLOCK_RADIANS);
    });

    it('advances counterclockwise through one revolution per inspection interval', () => {
      const claim = _createClaim(1);
      const startAngle = prepareBookClaimGlints(claim, STARTED_AT + 1000)[0].angle;
      expect(startAngle).toBeCloseTo(TWELVE_OCLOCK_RADIANS);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 1250)[0].angle - startAngle).toBeCloseTo(FULL_REVOLUTION_RADIANS / 4);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 1500)[0].angle - startAngle).toBeCloseTo(FULL_REVOLUTION_RADIANS / 2);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 1999)[0].angle - startAngle).toBeCloseTo(FULL_REVOLUTION_RADIANS * .999);
    });

    it('caps many-slot inspection at five seconds while keeping one revolution per slot', () => {
      const claim = _createClaim(10);
      const midpoint = prepareBookClaimGlints(claim, STARTED_AT + 1250);
      expect(midpoint[0].blank).toBe(claim.blanks[0]);
      expect(midpoint[0].angle - prepareBookClaimGlints(claim, STARTED_AT + 1000)[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS / 2);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 1500)[0].blank).toBe(claim.blanks[1]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 5999)[0].blank).toBe(claim.blanks[9]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 6000)).toHaveLength(10);
    });

    it('switches correctly at a fractional capped interval boundary', () => {
      const claim = { ..._createClaim(7), startedAt:0 };
      const boundary = 1000 + 5000 / 7;
      expect(prepareBookClaimGlints(claim, boundary - .001)[0].blank).toBe(claim.blanks[0]);
      const switched = prepareBookClaimGlints(claim, boundary);
      expect(switched[0].blank).toBe(claim.blanks[1]);
      expect(switched[0].angle).toBeCloseTo(TWELVE_OCLOCK_RADIANS);
    });

    it('illuminates every captured blank simultaneously for five 500ms success revolutions', () => {
      const claim = _createClaim();
      const start = prepareBookClaimGlints(claim, STARTED_AT + 3000);
      expect(start.map(glint => glint.blank)).toEqual(claim.blanks);
      start.forEach(glint => expect(glint.angle).toBeCloseTo(TWELVE_OCLOCK_RADIANS));
      const midpoint = prepareBookClaimGlints(claim, STARTED_AT + 3250);
      expect(midpoint).toHaveLength(2);
      midpoint.forEach((glint, index) => {
        expect(glint.page).toBe(claim.page);
        expect(glint.blank).toBe(claim.blanks[index]);
        expect(glint.angle - start[index].angle).toBeCloseTo(FULL_REVOLUTION_RADIANS / 2);
      });
      expect(prepareBookClaimGlints(claim, STARTED_AT + 3499)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS * .998);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 3500)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 4000)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS * 2);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 4500)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS * 3);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 5000)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS * 4);
      const finalLap = prepareBookClaimGlints(claim, STARTED_AT + 5250);
      expect(finalLap).toHaveLength(2);
      finalLap.forEach(glint => expect(glint.angle - start[0].angle).toBeCloseTo(FULL_REVOLUTION_RADIANS * 4.5));
      expect(prepareBookClaimGlints(claim, STARTED_AT + 5499)[0].angle - start[0].angle)
        .toBeCloseTo(FULL_REVOLUTION_RADIANS * 4.998);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 5500)).toEqual([]);
    });

    it('returns no glints throughout failure, recovery, or skipped sequence end', () => {
      const claim = _createClaim(2, false);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 3000)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 3999)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 4000)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 4499)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 100000)).toEqual([]);
    });

    it('returns no glints during success recovery or after completion', () => {
      const claim = _createClaim();
      expect(prepareBookClaimGlints(claim, STARTED_AT + 5750)).toEqual([]);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 6000)).toEqual([]);
    });

    it('samples skipped and repeated frames without mutating or rejudging the accepted sequence', () => {
      const claim = _createClaim();
      claim.blanks[0].playerAnswerIndex = -1;
      claim.blanks[1].correctAnswerIndexes.splice(0, 1, 4);
      claim.resultApplied = true;
      const before = structuredClone(claim);
      const first = prepareBookClaimGlints(claim, STARTED_AT + 3250);
      prepareBookClaimGlints(claim, STARTED_AT + 100000);
      prepareBookClaimGlints(claim, STARTED_AT + 1750);
      expect(prepareBookClaimGlints(claim, STARTED_AT + 3250)).toEqual(first);
      expect(first).toHaveLength(2);
      expect(claim).toEqual(before);
    });
  });
});