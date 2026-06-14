// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { formatHoursMinutes, formatHoursMinutesSeconds, truncateLabel } from '../labelUtil';

describe('labelUtil', () => {
  describe('truncateLabel()', () => {
    it('leaves short labels intact and hard-caps long ones with no marker', () => {
      expect(truncateLabel('Margery')).toBe('Margery');
      expect(truncateLabel('Margery the Maiden')).toBe('Margery the '); // 12-char cap.
      expect(truncateLabel('abcdef', 3)).toBe('abc');
    });
  });

  describe('formatHoursMinutes()', () => {
    it('renders zero-padded HH:MM, flooring seconds away', () => {
      expect(formatHoursMinutes(0)).toBe('00:00');
      expect(formatHoursMinutes(50_578_650)).toBe('14:02'); // 14:02:58.65 -> minute floor.
    });
  });

  describe('formatHoursMinutesSeconds()', () => {
    it('renders zero-padded HH:MM:SS, flooring milliseconds away', () => {
      expect(formatHoursMinutesSeconds(0)).toBe('00:00:00');
      expect(formatHoursMinutesSeconds(9_000)).toBe('00:00:09');
      expect(formatHoursMinutesSeconds(50_578_650)).toBe('14:02:58');
      expect(formatHoursMinutesSeconds(50_580_000)).toBe('14:03:00');
    });
  });
});
