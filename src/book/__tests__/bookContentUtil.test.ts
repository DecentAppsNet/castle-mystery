import { describe, expect, it } from 'vitest';
import { createBookState } from '../bookContentUtil';

describe('bookContentUtil', () => {
  describe('createBookState()', () => {
    it('generates the complete ordered 18-piece inventory from the stub conclusions', () => {
      const state = createBookState();
      const names = ['Amos of Jesi', 'Constance I', 'Pope Innocent III', 'Sofia the Midwife', 'Sticky Agatha', 'Ugolino di Conti'];
      const objects = ['Coffer', 'Holy Binky', 'Infant', 'Letter', 'Newborn Baby', 'Vase'];
      expect(state.pieceStack).toEqual([
        ...names.map((text, index) => ({ conclusionId:'identities', text, styleNo:0, xPercent:25, yPercent:5 + index * 5 })),
        ...objects.map((text, index) => ({ conclusionId:'the relic', text, styleNo:1, xPercent:75, yPercent:5 + index * 5 })),
        ...names.map((text, index) => ({ conclusionId:'the relic', text, styleNo:2, xPercent:75, yPercent:35 + index * 5 }))
      ]);
    });
  });
});