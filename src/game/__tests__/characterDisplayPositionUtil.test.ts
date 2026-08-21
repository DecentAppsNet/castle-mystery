import { describe, expect, it } from 'vitest';

import { findCharacterDisplayPosition } from '../characterDisplayPositionUtil';
import { calcItemCuboidHeightGame } from '../itemSizeUtil';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultItem } from '../types/Item';
import { createDefaultRoom } from '../types/Room';
import { createRoomContentDisplayLayout } from '../roomContentDisplayPositionUtil';

describe('characterDisplayPositionUtil', () => {
  describe('findCharacterDisplayPosition()', () => {
    it('applies cumulative stack offsets from all supporting items on the character square', () => {
      const room = {
        ...createDefaultRoom(),
        rect:{ x:0, y:0, width:40, height:30 },
        items:[
          { ...createDefaultItem(), id:'crate', position:{ x:12.5, y:29.999, z:0.5 }, stackOffset:{ x:1.5, y:-0.25, z:0.1 } },
          { ...createDefaultItem(), id:'box', position:{ x:12.5, y:29.999, z:0.5 }, stackOffset:{ x:-0.5, y:-0.75, z:-0.05 } }
        ]
      };
      const character = {
        ...createDefaultCharacter(),
        position:{ x:12.5, y:29.999, z:0.5 }
      };

      const displayLayout = createRoomContentDisplayLayout(room, [character]);
      const displayPosition = findCharacterDisplayPosition(character, displayLayout);
      expect(displayPosition.x).toBeCloseTo(13.5);
      expect(displayPosition.y).toBeCloseTo(29.999 - calcItemCuboidHeightGame(room) * 2 - 1);
      expect(displayPosition.z).toBeCloseTo(0.55);
    });
  });
});