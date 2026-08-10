import { describe, it, expect } from 'vitest';
import minimalMissingValuesGeneralText from './fixtures/general-minimal-missing-values.md?raw';
import duplicateAppearanceSectionsText from './fixtures/general-duplicate-appearance-sections.md?raw';
import duplicateCharacterSectionsText from './fixtures/general-duplicate-character-sections.md?raw';
import duplicateItemSectionsText from './fixtures/general-duplicate-item-sections.md?raw';
import duplicateRoomSectionsText from './fixtures/general-duplicate-room-sections.md?raw';
import invalidDiscoverableCharacterCountText from './fixtures/general-invalid-discoverable-character-count.md?raw';
import invalidDiscoverableItemCountText from './fixtures/general-invalid-discoverable-item-count.md?raw';
import invalidDiscoverableRoomCountText from './fixtures/general-invalid-discoverable-room-count.md?raw';
import populatedGeneralText from './fixtures/general-success-populated.md?raw';
import { loadLevelForTest } from './testLevelUtil';

describe('loading levels - general section', () => {
  it('loads default general-derived values into the returned level when optional properties are omitted', () => {
    const { level, errors } = loadLevelForTest(minimalMissingValuesGeneralText, 'general-minimal-missing-values.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.winSynopsis).toBe('You won the level!');
    expect(level?.backgroundImageUrl).toBeNull();
    expect(level?.groundFloorY).toBe(20);
    expect(level?.activeCharacterId).toBe('sam');
    expect(level?.labels).toEqual([
      { minutes:0, label:'midnight' },
      { minutes:0, label:'midnight' }
    ]);
  });

  it('loads the general values that are currently projected onto the returned level', () => {
    const { level, errors } = loadLevelForTest(populatedGeneralText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.winSynopsis).toBe('Case closed.');
    expect(level?.backgroundImageUrl).toBe('/assets/backgrounds/castle.png');
    expect(level?.groundFloorY).toBe(20);
  });

  it('fails if discoverableCharacterCount is specified and contains a non-integer value', () => {
    const { level, errors } = loadLevelForTest(invalidDiscoverableCharacterCountText, 'general-invalid-discoverable-character-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"1.5" is not an integer.');
  });

  it('fails if discoverableItemCount is specified and contains a negative value', () => {
    const { level, errors } = loadLevelForTest(invalidDiscoverableItemCountText, 'general-invalid-discoverable-item-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"-1" is not an integer.');
  });

  it('fails if discoverableRoomCount is specified and contains a non-numeric value', () => {
    const { level, errors } = loadLevelForTest(invalidDiscoverableRoomCountText, 'general-invalid-discoverable-room-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"NaN" is not an integer.');
  });

  it('fails if the rooms section contains duplicate room subsections with the same heading text', () => {
    const { level, errors } = loadLevelForTest(duplicateRoomSectionsText, 'general-duplicate-room-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Hall'");
  });

  it('fails if the characters section contains duplicate character subsections with the same heading text', () => {
    const { level, errors } = loadLevelForTest(duplicateCharacterSectionsText, 'general-duplicate-character-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Sam'");
  });

  it('fails if the items section contains duplicate item subsections with the same heading text', () => {
    const { level, errors } = loadLevelForTest(duplicateItemSectionsText, 'general-duplicate-item-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Key'");
  });

  it('fails if the characters section contains duplicate appearance subsections with the same heading text', () => {
    const { level, errors } = loadLevelForTest(duplicateAppearanceSectionsText, 'general-duplicate-appearance-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Default'");
  });
});