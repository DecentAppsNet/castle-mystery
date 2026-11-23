import { describe, expect, it } from 'vitest';
import { calcBookClaimShakeOffset, calcBookClaimTiming } from '../bookClaimTimingUtil';

describe('bookClaimTimingUtil', () => {
  describe('calcBookClaimShakeOffset()', () => {
    it('is exactly neutral before start and at or beyond completion for both result paths', () => {
      expect(calcBookClaimShakeOffset(-100, 3, false, 500)).toBe(0);
      expect(calcBookClaimShakeOffset(0, 3, true, 500)).toBe(0);
      expect(calcBookClaimShakeOffset(7000, 3, true, 500)).toBe(0);
      expect(calcBookClaimShakeOffset(6000, 3, false, 500)).toBe(0);
      expect(calcBookClaimShakeOffset(1000000, 3, false, 500)).toBe(0);
    });

    it('is deterministic across repeated and out-of-order elapsed samples', () => {
      const offset = calcBookClaimShakeOffset(1234, 3, false, 500);
      expect(offset).not.toBe(0);
      calcBookClaimShakeOffset(9000, 3, false, 500);
      calcBookClaimShakeOffset(100, 3, false, 500);
      expect(calcBookClaimShakeOffset(1234, 3, false, 500)).toBe(offset);
    });

    it('scales displacement with current book height without changing timing', () => {
      const offset = calcBookClaimShakeOffset(1234, 3, false, 500);
      expect(calcBookClaimShakeOffset(1234, 3, false, 1000)).toBeCloseTo(offset * 2);
      expect(calcBookClaimShakeOffset(1234, 3, false, 0)).toBeCloseTo(0);
    });

    it('stays within two percent of book height weighted by the fade and recovery envelope', () => {
      // Sample both capped and uncapped schedules through every stage without prescribing oscillation tuning.
      for (const slotCount of [1, 3, 10]) {
        for (const correct of [false, true]) {
          for (let elapsed = 0; elapsed <= 9000; elapsed += 17) {
            const timing = calcBookClaimTiming(elapsed, slotCount, correct);
            const offset = calcBookClaimShakeOffset(elapsed, slotCount, correct, 500);
            expect(Number.isFinite(offset)).toBe(true);
            expect(Math.abs(offset)).toBeLessThanOrEqual(500 * .02 * timing.envelope);
          }
        }
      }
    });

    it('shares shake between outcomes until their recovery schedules diverge', () => {
      expect(calcBookClaimShakeOffset(1234, 3, true, 500))
        .toBe(calcBookClaimShakeOffset(1234, 3, false, 500));
      const success = calcBookClaimShakeOffset(5750, 3, true, 500);
      expect(Math.abs(success)).toBeGreaterThan(0);
      expect(calcBookClaimShakeOffset(5750, 3, false, 500)).toBeCloseTo(success * .5);
    });
  });

  describe('calcBookClaimTiming()', () => {
    it('starts with neutral presentation and no owed results, including pre-start samples', () => {
      expect(calcBookClaimTiming(0, 1, true)).toMatchObject({ stage:'fade', progress:0, envelope:0,
        inspectedIndex:null, dueEjectionCount:0, shouldComplete:false, isDone:false });
      expect(calcBookClaimTiming(-100, 1, false)).toMatchObject({ stage:'fade', progress:0, envelope:0 });
    });

    it('ramps the envelope during fade and starts inspection exactly at its boundary', () => {
      expect(calcBookClaimTiming(500, 1, true)).toMatchObject({ stage:'fade', progress:.5, envelope:.5 });
      expect(calcBookClaimTiming(999, 1, true).stage).toBe('fade');
      expect(calcBookClaimTiming(1000, 1, true)).toMatchObject({ stage:'inspection', progress:0,
        inspectedIndex:0, envelope:1 });
      expect(calcBookClaimTiming(1500, 1, true)).toMatchObject({ stage:'inspection', progress:.5 });
    });

    it('retains a single success slot until its result interval ends', () => {
      expect(calcBookClaimTiming(1999, 1, true).stage).toBe('inspection');
      expect(calcBookClaimTiming(2000, 1, true)).toMatchObject({ stage:'success', progress:0,
        inspectedIndex:null, shouldComplete:false, envelope:1 });
      expect(calcBookClaimTiming(3250, 1, true)).toMatchObject({ stage:'success', progress:.5 });
      expect(calcBookClaimTiming(4499, 1, true).shouldComplete).toBe(false);
      expect(calcBookClaimTiming(4500, 1, true)).toMatchObject({ stage:'recovery', progress:0,
        shouldComplete:true, envelope:1 });
      expect(calcBookClaimTiming(4750, 1, true)).toMatchObject({ stage:'recovery', progress:.5, envelope:.5 });
      expect(calcBookClaimTiming(4999, 1, true).isDone).toBe(false);
      expect(calcBookClaimTiming(5000, 1, true)).toMatchObject({ stage:'message', progress:0, envelope:0, isDone:false });
      expect(calcBookClaimTiming(5500, 1, true)).toMatchObject({ stage:'message', progress:.5, envelope:0 });
      expect(calcBookClaimTiming(5999, 1, true).isDone).toBe(false);
      expect(calcBookClaimTiming(6000, 1, true)).toMatchObject({ stage:'done', envelope:0, isDone:true,
        shouldComplete:true, dueEjectionCount:0, totalDuration:6000 });
    });

    it('owes the first failure ejection at entry and retains its final interval', () => {
      expect(calcBookClaimTiming(1999, 1, false).dueEjectionCount).toBe(0);
      expect(calcBookClaimTiming(2000, 1, false)).toMatchObject({ stage:'failure', progress:0,
        dueEjectionCount:1, shouldComplete:false, envelope:1 });
      expect(calcBookClaimTiming(2499, 1, false).stage).toBe('failure');
      expect(calcBookClaimTiming(2500, 1, false)).toMatchObject({ stage:'recovery', dueEjectionCount:1 });
      expect(calcBookClaimTiming(2999, 1, false).isDone).toBe(false);
      expect(calcBookClaimTiming(3000, 1, false)).toMatchObject({ stage:'message', progress:0, envelope:0, isDone:false });
      expect(calcBookClaimTiming(3500, 1, false)).toMatchObject({ stage:'message', progress:.5, envelope:0 });
      expect(calcBookClaimTiming(3999, 1, false).isDone).toBe(false);
      expect(calcBookClaimTiming(4000, 1, false)).toMatchObject({ stage:'done', dueEjectionCount:1,
        shouldComplete:false, envelope:0, isDone:true });
    });

    it('switches inspected slots at exact boundaries for a few blanks', () => {
      expect(calcBookClaimTiming(1999, 3, false).inspectedIndex).toBe(0);
      expect(calcBookClaimTiming(2000, 3, false)).toMatchObject({ stage:'inspection', inspectedIndex:1, progress:0 });
      expect(calcBookClaimTiming(2999, 3, false).inspectedIndex).toBe(1);
      expect(calcBookClaimTiming(3000, 3, false)).toMatchObject({ stage:'inspection', inspectedIndex:2, progress:0 });
      expect(calcBookClaimTiming(3999, 3, false).inspectedIndex).toBe(2);
      expect(calcBookClaimTiming(4000, 3, false)).toMatchObject({ stage:'failure', inspectedIndex:null, dueEjectionCount:1 });
    });

    it('owes sequential failure ejections every interval, not count times the interval', () => {
      expect(calcBookClaimTiming(4499, 3, false).dueEjectionCount).toBe(1);
      expect(calcBookClaimTiming(4500, 3, false).dueEjectionCount).toBe(2);
      expect(calcBookClaimTiming(4999, 3, false).dueEjectionCount).toBe(2);
      expect(calcBookClaimTiming(5000, 3, false).dueEjectionCount).toBe(3);
      expect(calcBookClaimTiming(5499, 3, false).stage).toBe('failure');
      expect(calcBookClaimTiming(5500, 3, false)).toMatchObject({ stage:'recovery', envelope:1 });
      expect(calcBookClaimTiming(5750, 3, false).envelope).toBe(.5);
      expect(calcBookClaimTiming(6000, 3, false)).toMatchObject({ stage:'message', envelope:0 });
      expect(calcBookClaimTiming(7000, 3, false)).toMatchObject({ stage:'done', totalDuration:7000 });
    });

    it('uses the same inspection schedule but a fixed success interval for a few blanks', () => {
      expect(calcBookClaimTiming(4000, 3, true)).toMatchObject({ stage:'success', shouldComplete:false });
      expect(calcBookClaimTiming(6499, 3, true).shouldComplete).toBe(false);
      expect(calcBookClaimTiming(6500, 3, true)).toMatchObject({ stage:'recovery', shouldComplete:true });
      expect(calcBookClaimTiming(7000, 3, true)).toMatchObject({ stage:'message', envelope:0 });
      expect(calcBookClaimTiming(8000, 3, true)).toMatchObject({ stage:'done', totalDuration:8000 });
    });

    it('caps inspection and failure totals for many blanks', () => {
      expect(calcBookClaimTiming(1499, 10, false).inspectedIndex).toBe(0);
      expect(calcBookClaimTiming(1500, 10, false)).toMatchObject({ stage:'inspection', inspectedIndex:1, progress:0 });
      expect(calcBookClaimTiming(5500, 10, false).inspectedIndex).toBe(9);
      expect(calcBookClaimTiming(5999, 10, false).stage).toBe('inspection');
      expect(calcBookClaimTiming(6000, 10, false)).toMatchObject({ stage:'failure', dueEjectionCount:1 });
      expect(calcBookClaimTiming(6249, 10, false).dueEjectionCount).toBe(1);
      expect(calcBookClaimTiming(6250, 10, false).dueEjectionCount).toBe(2);
      expect(calcBookClaimTiming(8250, 10, false).dueEjectionCount).toBe(10);
      expect(calcBookClaimTiming(8499, 10, false).stage).toBe('failure');
      expect(calcBookClaimTiming(8500, 10, false).stage).toBe('recovery');
      expect(calcBookClaimTiming(9000, 10, false)).toMatchObject({ stage:'message', envelope:0 });
      expect(calcBookClaimTiming(10000, 10, false)).toMatchObject({ stage:'done', totalDuration:10000 });
    });

    it('caps many-slot success inspection without changing success or recovery durations', () => {
      expect(calcBookClaimTiming(6000, 10, true)).toMatchObject({ stage:'success', shouldComplete:false });
      expect(calcBookClaimTiming(8499, 10, true).shouldComplete).toBe(false);
      expect(calcBookClaimTiming(8500, 10, true)).toMatchObject({ stage:'recovery', shouldComplete:true });
      expect(calcBookClaimTiming(9000, 10, true)).toMatchObject({ stage:'message', envelope:0 });
      expect(calcBookClaimTiming(10000, 10, true)).toMatchObject({ stage:'done', totalDuration:10000 });
    });

    it('starts the next slot at fractional capped boundaries', () => {
      expect(calcBookClaimTiming(1000 + 5000 / 7, 7, false)).toMatchObject({ stage:'inspection', inspectedIndex:1 });
      expect(calcBookClaimTiming(6000 + 2500 / 7, 7, false).dueEjectionCount).toBe(2);
    });

    it('does not accumulate progress across repeated or out-of-order samples', () => {
      const sample = calcBookClaimTiming(2100, 3, false);
      calcBookClaimTiming(9000, 3, false);
      calcBookClaimTiming(0, 3, false);
      expect(calcBookClaimTiming(2100, 3, false)).toEqual(sample);
      expect(calcBookClaimTiming(2100, 3, false)).toEqual(sample);
    });

    it('retains every owed result when a frame skips the whole sequence', () => {
      expect(calcBookClaimTiming(1000000, 100, false)).toMatchObject({ stage:'done', progress:1,
        envelope:0, inspectedIndex:null, dueEjectionCount:100, shouldComplete:false, isDone:true, totalDuration:10000 });
      expect(calcBookClaimTiming(1000000, 100, true)).toMatchObject({ stage:'done', progress:1,
        envelope:0, dueEjectionCount:0, shouldComplete:true, isDone:true, totalDuration:10000 });
    });
  });
});