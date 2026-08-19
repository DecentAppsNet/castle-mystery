import { describe, expect, it } from 'vitest';

import { findNextItemStackPosition } from '../itemStackPositionUtil';
import { calcItemCuboidHeightGame } from '../itemSizeUtil';
import { createDefaultItem } from '../types/Item';
import { createDefaultRoom } from '../types/Room';

describe('itemStackPositionUtil', () => {
  describe('findNextItemStackPosition()', () => {
    it('places an item one cuboid height above the current top item', () => {
      const room = { ...createDefaultRoom(), rect:{ x:0, y:0, width:40, height:30 } };
      const targetPosition = { x:10, y:30, z:0.5 };
      const height = calcItemCuboidHeightGame(room);
      const roomItems = [
        { ...createDefaultItem(), id:'table', position:targetPosition },
        { ...createDefaultItem(), id:'vase', position:{ ...targetPosition, y:targetPosition.y - height } }
      ];

      expect(findNextItemStackPosition(room, targetPosition, roomItems)).toEqual({
        ...targetPosition,
        y:targetPosition.y - height * 2
      });
    });
  });
});