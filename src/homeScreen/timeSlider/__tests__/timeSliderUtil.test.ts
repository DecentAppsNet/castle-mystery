// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { formatMinutes } from '../timeSliderUtil';
import { SECS_IN_HOUR, SECS_IN_MINUTE } from '@/common/timeUtil';

function minutesFor(hours:number, mins:number = 0, secs:number = 0):number {
  return (hours * SECS_IN_HOUR + mins * SECS_IN_MINUTE + secs) / SECS_IN_MINUTE;
}

describe('timeSliderUtil', () => {
  describe('formatMinutes()', () => {
    it('formats midnight as 12:00:00 AM', () => {
      expect(formatMinutes(minutesFor(0))).toBe('12:00:00 AM');
    });

    it('formats noon as 12:00:00 PM', () => {
      expect(formatMinutes(minutesFor(12))).toBe('12:00:00 PM');
    });

    it('formats whole-minute morning times with explicit :00 seconds', () => {
      expect(formatMinutes(minutesFor(9, 30))).toBe('9:30:00 AM');
    });

    it('formats afternoon times with PM suffix', () => {
      expect(formatMinutes(minutesFor(19, 30))).toBe('7:30:00 PM');
    });

    it('includes seconds in the formatted output', () => {
      expect(formatMinutes(minutesFor(1, 23, 45))).toBe('1:23:45 AM');
    });

    it('wraps cross-midnight times through the 24-hour boundary', () => {
      expect(formatMinutes(minutesFor(25, 36, 8))).toBe('1:36:08 AM');
    });

    it('wraps 23:59 to 00:00 after one minute of advance', () => {
      expect(formatMinutes(minutesFor(23, 59))).toBe('11:59:00 PM');
      expect(formatMinutes(minutesFor(24))).toBe('12:00:00 AM');
    });

    it('formats hour-15 timestamps that cross midnight twice as wall-clock', () => {
      expect(formatMinutes(minutesFor(31))).toBe('7:00:00 AM');
    });
  });
});
