import { describe, expect, it } from 'vitest';

import { createInitialTimelineSnapshot } from '../snapshotUtil';
import { createDefaultCharacter, DEFAULT_FACING_DIRECTION } from '@/game/types/Character';
import { createDefaultCharacterKeyframe } from '@/game/types/CharacterKeyframe';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultRoomKeyframe } from '@/game/types/RoomKeyframe';
import Timeline from '@/game/types/Timeline';

function _createTimeline():Timeline {
  return {
    characterIdToI:{ sam:0 },
    roomIdToI:{ hall:0 },
    keyframes:[{
      time:0,
      characters:[{
        ...createDefaultCharacterKeyframe(),
        bodyOrientation:'standing',
        facingDirection:'left',
        position:{ x:5, y:5, z:0 }
      }],
      rooms:[createDefaultRoomKeyframe()]
    }]
  };
}

describe('snapshotUtil', () => {
  describe('createInitialTimelineSnapshot()', () => {
    it('uses keyed character values at the initial time instead of authored base values', () => {
      const character = {
        ...createDefaultCharacter(),
        id:'sam',
        bodyOrientation:'sitting' as const,
        facingDirection:DEFAULT_FACING_DIRECTION,
        position:{ x:5, y:5, z:0 }
      };
      const room = { ...createDefaultRoom(), id:'hall' };

      const snapshot = createInitialTimelineSnapshot([character], [room], _createTimeline(), 'sam', 0);

      expect(snapshot.characters[0].bodyOrientation).toBe('standing');
      expect(snapshot.characters[0].facingDirection).toBe('left');
    });
  });
});
