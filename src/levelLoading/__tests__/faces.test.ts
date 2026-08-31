import { describe, expect, it } from 'vitest';

import { createCharacterKeyframeAtTime } from '@/game/timeline';
import { FacingDirection } from '@/game/types/Character';
import { ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z } from '@/game/roomSpaceConstants';

import defaultLevelText from './fixtures/faces/faces-base.md?raw';
import windingStairLevelText from './fixtures/faces/faces-winding-stair.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadSamFacingDirection(itineraryLines:readonly string[], time:number):FacingDirection {
  const text = replaceSection(defaultLevelText, 'itinerary', itineraryLines);
  const { level, errors } = loadLevelForTest(text, 'faces.md');

  expect(errors.describeErrors()).toBe('');
  expect(level).not.toBeNull();
  const samI = level!.timeline.characterIdToI.sam;
  return createCharacterKeyframeAtTime(level!.timeline.keyframes, samI, time).facingDirection;
}

describe('level loading - faces activities', () => {
  it('loads faces activity with an absolute timestamp', () => {
    const facingDirection = _loadSamFacingDirection([
      '0:00:00 Sam faces right',
      '0:00:01 Sam faces left'
    ], 1_000);

    expect(facingDirection).toBe('left');
  });

  it('loads faces activity with a relative timestamp', () => {
    const facingDirection = _loadSamFacingDirection([
      '0:00:00 Sam waits 1',
      ': faces left'
    ], 1_000);

    expect(facingDirection).toBe('left');
  });

  it('faces activity with implied subject defaults to active character', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 faces left'], 0);

    expect(facingDirection).toBe('left');
  });

  it('character faces left', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces left'], 0);

    expect(facingDirection).toBe('left');
  });

  it('character faces right', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces right'], 0);

    expect(facingDirection).toBe('right');
  });

  it('character faces another character', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Benny'], 0);

    expect(facingDirection).toBe('right');
  });

  it('character faces an item in the same room', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Hall Relic'], 0);

    expect(facingDirection).toBe('left');
  });

  it('character faces an item in a different room', () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Closet Relic'], 0);

    expect(facingDirection).toBe('right');
  });

  it("character faces an item in another character's left hand", () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Left Hand Relic'], 0);

    expect(facingDirection).toBe('right');
  });

  it("character faces an item in another character's right hand", () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Right Hand Relic'], 0);

    expect(facingDirection).toBe('right');
  });

  it("character faces an item in another character's inventory", () => {
    const facingDirection = _loadSamFacingDirection(['0:00:00 Sam faces Inventory Relic'], 0);

    expect(facingDirection).toBe('right');
  });

  it('faces in each travel direction while climbing a winding stair', () => {
    const { level, errors } = loadLevelForTest(windingStairLevelText, 'faces-winding-stair.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    const stairwell = level!.rooms.find(room => room.id === 'stairwell')!;
    const firstFlightEnd = level!.timeline.keyframes.find(keyframe => {
      const position = keyframe.characters[samI].position;
      return position.x === stairwell.rect.x + 15 && position.z === ROOM_BACK_ROW_CENTER_Z;
    });
    const secondFlightEnd = level!.timeline.keyframes.find(keyframe => {
      const position = keyframe.characters[samI].position;
      return position.x === stairwell.rect.x + 5 && position.z === ROOM_FRONT_ROW_CENTER_Z;
    });

    expect(firstFlightEnd?.characters[samI].facingDirection).toBe('right');
    expect(secondFlightEnd?.characters[samI].facingDirection).toBe('left');
  });
});
