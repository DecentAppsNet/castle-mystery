import { describe, it } from 'vitest';
import { createBookState } from '../bookContentUtil';

describe('bookContentUtil', () => {
  describe('createBookState()', () => {
    it('creates book state without throwing', () => {
      const bookState = createBookState();
      console.log(bookState);
    });
  });
});