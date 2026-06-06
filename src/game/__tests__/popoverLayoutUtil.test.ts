import { describe, expect, it } from 'vitest';

import { choosePopoverBoxRect } from '../popoverLayoutUtil';

describe('popoverLayoutUtil', () => {
  describe('choosePopoverBoxRect()', () => {
    it('prefers a right-centered placement when it fits without overlap', () => {
      const rect = choosePopoverBoxRect({ x:20, y:30, width:20, height:20 }, 40, 30, 200, 120, 10);

      expect(rect).toEqual({ x:50, y:25, width:40, height:30 });
    });

    it('chooses below when right placement would be clamped into overlap', () => {
      const rect = choosePopoverBoxRect({ x:160, y:30, width:20, height:20 }, 50, 30, 200, 120, 10);

      expect(rect).toEqual({ x:145, y:60, width:50, height:30 });
    });

    it('chooses above before left when right and below both overlap after clamping', () => {
      const rect = choosePopoverBoxRect({ x:160, y:80, width:20, height:20 }, 50, 30, 200, 120, 10);

      expect(rect).toEqual({ x:145, y:40, width:50, height:30 });
    });

    it('uses left as a last resort when the other placements overlap more', () => {
      const rect = choosePopoverBoxRect({ x:120, y:20, width:70, height:80 }, 60, 30, 200, 120, 10);

      expect(rect).toEqual({ x:50, y:45, width:60, height:30 });
    });
  });
});