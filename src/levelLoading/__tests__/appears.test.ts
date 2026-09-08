import { describe, expect, it } from 'vitest';
import { createInitialTimelineSnapshot } from '@/game/timeline/snapshotUtil';
import appearsBaseText from './fixtures/appears/appears-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';
import Level from '@/game/types/Level';

describe('level loading - appears activities', () => {
  function snapshotAt(level:Level, time:number) {
    const obscuredRoomIds = new Set(level.discoveryConfig.initiallyObscuredRoomIds);
    return createInitialTimelineSnapshot(level.characters, level.rooms, level.timeline, 
        level.activeCharacterId, time, obscuredRoomIds).activeCharacter;
  }

  it('applies the selected skin to a character at the appearance time', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Detective']);
    const { level, errors } = loadLevelForTest(text, 'appears-skin.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000)).toMatchObject({
      faceImageUrl:'/assets/faces/detective.png', description:'Detective description.'
    });
  });

  it('restores the base appearance when a character appears as default', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:10 Sam appears default'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-default.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 10_000)).toMatchObject({
      faceImageUrl:'/assets/faces/base.png', description:'Base description.'
    });
  });

  it('can apply another skin after restoring the base appearance', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:10 Sam appears default', '0:00:15 Sam appears Witness'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-skin-default-skin.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 15_000)).toMatchObject({
      faceImageUrl:'/assets/faces/base.png', description:'Witness description.'
    });
  });

  it('uses only the last skin when appearances share a timestamp', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:05 Sam appears Guard'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-same-time.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000)).toMatchObject({
      faceImageUrl:'/assets/faces/guard.png', description:'Base description.'
    });
  });

  it('keeps the base face image when the selected skin has no face image', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Witness']);
    const { level, errors } = loadLevelForTest(text, 'appears-skin-without-face.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000).faceImageUrl).toBe('/assets/faces/base.png');
  });

  it('keeps the base description when the selected skin has no description', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Guard']);
    const { level, errors } = loadLevelForTest(text, 'appears-skin-without-description.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000).description).toBe('Base description.');
  });

  it('reports an error when a character appears using another character’s skin', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Butler']);
    const { level, errors } = loadLevelForTest(text, 'appears-wrong-character-skin.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(`sam can't appear as "butler" because no skin with that name is defined for this character.`);
  });

  /*
  Some explanation on expected behavior for implementation of tests below.

  A character can have multiple skins. Levels can be designed such that learning that two different appearances (skins) are the same
  character. Skins are grouped into sets that indicate if the game will treat the skin-depicted characters as separate or the same 
  character to the player. The term for this in the code is "revealed skin linkage" with "linkage" / "linked" used here in this text to
  mean that one skin is presented by the game as being the same character when one or more other skins are being shown.

  Internally, the snapshot is revised to hide information from the player based on linkage. As an example, Sam begins in a level with
  no skin applied to his appearance (Character.skinId === 'sam-default'). Sam walks into an obscured room, changes appearance to a disguise 
  (`: appears disguised`), and returns to the first room in the disguise.

  When "appears" activities occur in an obscured room, they do
  */

  it.todo('');
});