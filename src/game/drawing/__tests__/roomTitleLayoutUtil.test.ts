import { describe, expect, it } from 'vitest';

import { wrapRoomTitle } from '../roomTitleLayoutUtil';

describe('roomTitleLayoutUtil', () => {
  describe('wrapRoomTitle()', () => {
    it('keeps words on one line when they fit', () => {
      expect(wrapRoomTitle('Throne Room', 20, text => text.length)).toEqual(['Throne Room']);
    });

    it('wraps later words onto a new line when the combined line would overflow', () => {
      expect(wrapRoomTitle('Throne Room', 8, text => text.length)).toEqual(['Throne', 'Room']);
    });

    it('allows a single long word to overflow rather than splitting it', () => {
      expect(wrapRoomTitle('Grandhall Room', 5, text => text.length)).toEqual(['Grandhall', 'Room']);
    });

    it('collapses extra whitespace while wrapping', () => {
      expect(wrapRoomTitle('  Throne   Room  West  ', 11, text => text.length)).toEqual(['Throne Room', 'West']);
    });
  });
});