import { describe, expect, it } from 'vitest';

import { findCharacterDisplayPosition } from '../characterDisplayPositionUtil';
import { calcItemCuboidHeightGame } from '../itemSizeUtil';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultItem } from '../types/Item';
import { createDefaultRoom } from '../types/Room';

describe('characterDisplayPositionUtil', () => {
  describe('findCharacterDisplayPosition()', () => {
    it('applies cumulative stack offsets from all supporting items on the character square', () => {
      const room = {
        ...createDefaultRoom(),
        rect:{ x:0, y:0, width:40, height:30 },
        items:[
          { ...createDefaultItem(), id:'crate', position:{ x:10, y:29.999, z:0.5 }, stackOffset:{ x:1.5, y:-0.25, z:0.1 } },
          { ...createDefaultItem(), id:'box', position:{ x:10, y:26.82, z:0.5 }, stackOffset:{ x:-0.5, y:-0.75, z:-0.05 } }
        ]
      };
      const character = {
        ...createDefaultCharacter(),
        position:{ x:10, y:29.999, z:0.5 }
      };

      expect(findCharacterDisplayPosition(character, room)).toEqual({
        x:11,
        y:26.82 - calcItemCuboidHeightGame(room) - 1,
        z:0.55
      });
    });
  });
});