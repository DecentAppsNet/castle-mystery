import { describe, expect, it } from 'vitest';

import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';
import { createCharacterKeyframeForTest } from '@/game/test/keyframeTestUtil';
import { createInitialTimelineSnapshot } from '@/game/timeline';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import Timeline from '@/game/types/Timeline';
import { findHoveredItem } from '../hoverStateUtil';

describe('hoverStateUtil', () => {
  describe('findHoveredItem()', () => {
    it('does not resolve a retained hover ID to an invisible item without a layout', () => {
      const item = { ...createDefaultItem(), description:'An interactive item.', isVisible:false };
      const room = { ...createDefaultRoom(), items:[item] };

      expect(createRoomContentDisplayLayout(room, []).itemLayoutById.has(item.id)).toBe(false);
      expect(findHoveredItem([room], item.id, false, new Set([room.id]))).toBeNull();
    });

    it('keeps retained hover targets consistent with layouts when repeatedly seeking in both directions', () => {
      const item = { ...createDefaultItem(), description:'An interactive item.' };
      const room = { ...createDefaultRoom(), rect:{ x:0, y:0, width:10, height:10 }, items:[item] };
      const character = { ...createDefaultCharacter(), position:{ x:5, y:5, z:0 } };
      const characters = [{ ...createCharacterKeyframeForTest(), position:character.position }];
      const timeline:Timeline = {
        startTime:1000, endTime:2000,
        characterIds:[character.id], characterIdToI:{ [character.id]:0 }, roomIdToI:{ [room.id]:0 },
        keyframes:[
          { time:1000, characters, rooms:[{ items:[item], exits:[] }] },
          { time:2000, characters, rooms:[{ items:[{ ...item, isVisible:false }], exits:[] }] }
        ]
      };

      for (const time of [1000, 2000, 1500, 2000, 1000, 2000, 1000]) {
        const snapshot = createInitialTimelineSnapshot([character], [room], timeline, character.id, time, new Set());
        const target = findHoveredItem(snapshot.rooms, item.id, false, new Set([room.id]));
        const layout = createRoomContentDisplayLayout(snapshot.rooms[0], []);

        expect(target !== null).toBe(time < 2000);
        if (target) expect(layout.itemLayoutById.has(target.item.id)).toBe(true);
      }
    });
  });
});