import { describe, expect, it } from 'vitest';
import { createInitialTimelineSnapshot } from '@/game/timeline/snapshotUtil';
import appearsBaseText from './fixtures/appears/appears-base.md?raw';
import initialAppearanceText from './fixtures/initial-appearance.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';
import Level from '@/game/types/Level';
import { getHeadImageUrl } from '@/game/characterBody';

describe('level loading - appears activities', () => {
  function snapshotAt(level:Level, time:number) {
    const obscuredRoomIds = new Set(level.discoveryConfig.initiallyObscuredRoomIds);
    return createInitialTimelineSnapshot(level.characters, level.rooms, level.timeline, 
        level.activeCharacterId, time, obscuredRoomIds).activeCharacter;
  }

  it('applies an initial skin and lets later default and named appearances override it', () => {
    const level = loadValidLevelForTest(initialAppearanceText);
    expect(snapshotAt(level, 0)).toMatchObject({
      skinId:'sam-detective', description:'Detective description.'
    });
    expect(snapshotAt(level, 5_000)).toMatchObject({
      skinId:'sam-default', description:'Base description.'
    });
    expect(snapshotAt(level, 10_000)).toMatchObject({
      skinId:'sam-witness', description:'Witness description.'
    });
    expect(getHeadImageUrl(snapshotAt(level, 0).rootBodyPart)).toBe('/assets/bodies/detective.png');
    expect(getHeadImageUrl(snapshotAt(level, 5_000).rootBodyPart)).toBe('/assets/bodies/samBase.png');
    expect(getHeadImageUrl(snapshotAt(level, 10_000).rootBodyPart)).toBe('/assets/bodies/samBase.png');
    expect(snapshotAt(level, 0).skinId).toBe('sam-detective');
  });

  it('resolves skin heads without modifying base anatomy or skin definitions', () => {
    const level = loadValidLevelForTest(initialAppearanceText);
    const base = level.characters.find(character => character.id === 'sam')!;
    const before = structuredClone(base);
    const overridden = snapshotAt(level, 0);
    const restored = snapshotAt(level, 5_000);
    const inherited = snapshotAt(level, 10_000);

    expect(overridden.rootBodyPart.connectedParts[0].part.imageUrl).toBe('/assets/bodies/detective.png');
    expect(overridden.rootBodyPart).not.toBe(base.rootBodyPart);
    expect(overridden.rootBodyPart.connectedParts[1]).toBe(base.rootBodyPart.connectedParts[1]);
    expect(overridden.rootBodyPart.connectedParts[0].part.pivotPoint).toBe(base.rootBodyPart.connectedParts[0].part.pivotPoint);
    expect(restored.rootBodyPart).toBe(base.rootBodyPart);
    expect(inherited.rootBodyPart).toBe(base.rootBodyPart);
    expect(getHeadImageUrl(restored.rootBodyPart)).toBe('/assets/bodies/samBase.png');
    expect(getHeadImageUrl(inherited.rootBodyPart)).toBe('/assets/bodies/samBase.png');
    expect(base).toEqual(before);
    expect(base.skins.find(skin => skin.id === 'sam-detective')?.headImageUrl).toBe(getHeadImageUrl(overridden.rootBodyPart));
  });

  it('restores an absent base head image after an initial skin override', () => {
    const text = initialAppearanceText.replace('* headImage=samBase.png', '');
    const level = loadValidLevelForTest(text);
    const base = level.characters.find(character => character.id === 'sam')!;
    const overridden = snapshotAt(level, 0);
    const restored = snapshotAt(level, 5_000);
    const inherited = snapshotAt(level, 10_000);

    expect(overridden.rootBodyPart.connectedParts[0].part.imageUrl).toBe('/assets/bodies/detective.png');
    expect(base.rootBodyPart.connectedParts[0].part.imageUrl).toBeNull();
    expect(restored.rootBodyPart).toBe(base.rootBodyPart);
    expect(getHeadImageUrl(restored.rootBodyPart)).toBeNull();
    expect(inherited.rootBodyPart).toBe(base.rootBodyPart);
    expect(getHeadImageUrl(inherited.rootBodyPart)).toBeNull();
  });

  it('applies the selected skin to a character at the appearance time', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Detective']);
    const { level, errors } = loadLevelForTest(text, 'appears-skin.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000)).toMatchObject({
      description:'Detective description.'
    });
    expect(getHeadImageUrl(snapshotAt(level!, 5_000).rootBodyPart)).toBe('/assets/bodies/detective.png');
  });

  it('restores the base appearance when a character appears as default', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:10 Sam appears default'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-default.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 10_000)).toMatchObject({
      description:'Base description.'
    });
    expect(getHeadImageUrl(snapshotAt(level!, 10_000).rootBodyPart)).toBe('/assets/bodies/base.png');
  });

  it('can apply another skin after restoring the base appearance', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:10 Sam appears default', '0:00:15 Sam appears Witness'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-skin-default-skin.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 15_000)).toMatchObject({
      description:'Witness description.'
    });
    expect(getHeadImageUrl(snapshotAt(level!, 15_000).rootBodyPart)).toBe('/assets/bodies/base.png');
  });

  it('uses only the last skin when appearances share a timestamp', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', [
      '0:00:05 Sam appears Detective', '0:00:05 Sam appears Guard'
    ]);
    const { level, errors } = loadLevelForTest(text, 'appears-same-time.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(snapshotAt(level!, 5_000)).toMatchObject({
      description:'Base description.'
    });
    expect(getHeadImageUrl(snapshotAt(level!, 5_000).rootBodyPart)).toBe('/assets/bodies/guard.png');
  });

  it('keeps the base head image when the selected skin has no head image', () => {
    const text = replaceSection(appearsBaseText, 'itinerary', ['0:00:05 Sam appears Witness']);
    const { level, errors } = loadLevelForTest(text, 'appears-skin-without-head.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(getHeadImageUrl(snapshotAt(level!, 5_000).rootBodyPart)).toBe('/assets/bodies/base.png');
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
});