// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import TimeRange from '../types/TimeRange';
import { subtractRanges } from '../timeRangeUtil';

const _range = (startTime:number, endTime:number):TimeRange => ({ startTime, endTime });

describe('timeRangeUtil', () => {
  describe('subtractRanges()', () => {
    it('returns the original ranges when either array is empty', () => {
      const ranges = [_range(10, 20)];

      expect(subtractRanges(ranges, [])).toBe(ranges);
      expect(subtractRanges([], [_range(12, 18)])).toEqual([]);
    });

    it('returns the original ranges when no ranges overlap', () => {
      const ranges = [_range(10, 20)];

      expect(subtractRanges(ranges, [_range(21, 30)])).toBe(ranges);
    });

    it('retains an unaffected range when another range is subtracted', () => {
      expect(subtractRanges([_range(10, 20), _range(30, 40)], [_range(12, 18)])).toEqual([
        _range(10, 12), _range(18, 20), _range(30, 40)
      ]);
    });

    it('removes a range exactly matched by a subtraction range', () => {
      expect(subtractRanges([_range(10, 20)], [_range(10, 20)])).toEqual([]);
    });

    it('removes a range covered by a larger subtraction range', () => {
      expect(subtractRanges([_range(10, 20)], [_range(5, 25)])).toEqual([]);
    });

    it('removes two ranges covered by one subtraction range', () => {
      expect(subtractRanges([_range(10, 20), _range(30, 40)], [_range(5, 45)])).toEqual([]);
    });

    it('adjusts a range start when subtraction overlaps only its start', () => {
      expect(subtractRanges([_range(10, 20)], [_range(5, 15)])).toEqual([_range(15, 20)]);
    });

    it('adjusts a range end when subtraction overlaps only its end', () => {
      expect(subtractRanges([_range(10, 20)], [_range(15, 25)])).toEqual([_range(10, 15)]);
    });
  });
});