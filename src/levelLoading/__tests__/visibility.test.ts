import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import Item from '@/game/types/Item';
import Level from '@/game/types/Level';

import itemPlacementText from './fixtures/items/items-placement.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadVisibility(itineraryLines:readonly string[], text:string = itemPlacementText) {
  return loadLevelForTest(replaceSection(text, 'itinerary', [
    '0:00:00 Sam waits 2',
    ...itineraryLines
  ]), 'visibility.md');
}

function _findItemAtTime(level:Level, itemId:string, time:number):Item {
  const snapshot = createKeyframeAtTime(level.timeline.keyframes, time);
  const roomItem = snapshot.rooms.flatMap(room => room.items).find(item => item.id === itemId);
  if (roomItem) return roomItem;

  const characterItem = snapshot.characters
    .flatMap(character => [character.leftHandItem, character.rightHandItem, ...character.items])
    .find((item):item is Item => item !== null && item.id === itemId);
  expect(characterItem).toBeDefined();
  return characterItem!;
}

describe('level loading - visibility activities', () => {
  it('hides and later shows a character', () => {
    const { level, errors } = _loadVisibility([
      '0:00:00 hide Sam',
      '0:00:01 show Sam'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0).characters[samI].isVisible).toBe(false);
    expect(createKeyframeAtTime(level!.timeline.keyframes, 1_000).characters[samI].isVisible).toBe(true);
  });

  it('shows an initially hidden character', () => {
    const text = itemPlacementText.replace('## Sam\n* items=Pencil', '## Sam\n* visible=false\n* items=Pencil');
    const { level, errors } = _loadVisibility(['0:00:00 show Sam'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const samI = level!.timeline.characterIdToI.sam;
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0).characters[samI].isVisible).toBe(true);
  });

  it('hides and later shows a room item', () => {
    const { level, errors } = _loadVisibility([
      '0:00:01 hide Key',
      '0:00:02 show Key'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findItemAtTime(level!, 'key', 1_000).isVisible).toBe(false);
    expect(_findItemAtTime(level!, 'key', 2_000).isVisible).toBe(true);
  });

  it('shows an initially hidden room item', () => {
    const text = itemPlacementText.replace('## Key\n', '## Key\n* visible=false\n');
    const { level, errors } = _loadVisibility(['0:00:01 show Key'], text);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findItemAtTime(level!, 'key', 1_000).isVisible).toBe(true);
  });

  it('hides an inventory item', () => {
    const { level, errors } = _loadVisibility(['0:00:01 hide Pencil']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findItemAtTime(level!, 'pencil', 1_000).isVisible).toBe(false);
  });

  it('hides an item in the left hand', () => {
    const { level, errors } = _loadVisibility(['0:00:01 hide Eraser']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findItemAtTime(level!, 'eraser', 1_000).isVisible).toBe(false);
  });

  it('hides an item in the right hand', () => {
    const { level, errors } = _loadVisibility(['0:00:01 hide Paper']);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(_findItemAtTime(level!, 'paper', 1_000).isVisible).toBe(false);
  });
});