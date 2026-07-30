import { describe, it, expect } from 'vitest';
import ErrorCollector from '../errorCollection/ErrorCollector';
import SourceLineMap from '../importing/types/SourceLineMap';
import { loadLevelFromText } from '../loadLevelUtil';
import defaultLevelText from './fixtures/default-level.md?raw';
import duplicateAppearanceSectionsText from './fixtures/general-duplicate-appearance-sections.md?raw';
import duplicateCharacterSectionsText from './fixtures/general-duplicate-character-sections.md?raw';
import duplicateItemSectionsText from './fixtures/general-duplicate-item-sections.md?raw';
import duplicateRoomSectionsText from './fixtures/general-duplicate-room-sections.md?raw';
import invalidDiscoverableCharacterCountText from './fixtures/general-invalid-discoverable-character-count.md?raw';
import invalidDiscoverableItemCountText from './fixtures/general-invalid-discoverable-item-count.md?raw';
import invalidDiscoverableRoomCountText from './fixtures/general-invalid-discoverable-room-count.md?raw';
import populatedGeneralText from './fixtures/general-success-populated.md?raw';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
  return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

function _loadLevel(text:string, filename:string) {
  const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
  const level = loadLevelFromText(text, errors);
  return { level, errors };
}

describe('loading levels - general section', () => {
  it('loads default general-derived values into the returned level when optional properties are omitted', () => {
    const { level, errors } = _loadLevel(defaultLevelText, 'default-level.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(0);
    expect(level?.discoverableItemCount).toBe(0);
    expect(level?.discoverableRoomCount).toBe(0);
    expect(level?.winSynopsis).toBe('You won the level!');
    expect(level?.backgroundImageUrl).toBeNull();
    expect(level?.groundFloorY).toBe(20);
    expect(level?.activeCharacterId).toBe('');
    expect(level?.labels).toEqual([
      { minutes:0, label:'midnight' },
      { minutes:0, label:'midnight' }
    ]);
  });

  it('loads the general values that are currently projected onto the returned level', () => {
    const { level, errors } = _loadLevel(populatedGeneralText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(0);
    expect(level?.discoverableItemCount).toBe(0);
    expect(level?.discoverableRoomCount).toBe(0);
    expect(level?.winSynopsis).toBe('Case closed.');
    expect(level?.backgroundImageUrl).toBe('/assets/backgrounds/castle.png');
    expect(level?.groundFloorY).toBe(20);
  });

  it('fails if discoverableCharacterCount is specified and contains a non-integer value', () => {
    const { level, errors } = _loadLevel(invalidDiscoverableCharacterCountText, 'general-invalid-discoverable-character-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"1.5" is not an integer.');
  });

  it('fails if discoverableItemCount is specified and contains a negative value', () => {
    const { level, errors } = _loadLevel(invalidDiscoverableItemCountText, 'general-invalid-discoverable-item-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"-1" is not an integer.');
  });

  it('fails if discoverableRoomCount is specified and contains a non-numeric value', () => {
    const { level, errors } = _loadLevel(invalidDiscoverableRoomCountText, 'general-invalid-discoverable-room-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"NaN" is not an integer.');
  });

  it('fails if the rooms section contains duplicate room subsections with the same heading text', () => {
    const { level, errors } = _loadLevel(duplicateRoomSectionsText, 'general-duplicate-room-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Hall'");
  });

  it('fails if the characters section contains duplicate character subsections with the same heading text', () => {
    const { level, errors } = _loadLevel(duplicateCharacterSectionsText, 'general-duplicate-character-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Sam'");
  });

  it('fails if the items section contains duplicate item subsections with the same heading text', () => {
    const { level, errors } = _loadLevel(duplicateItemSectionsText, 'general-duplicate-item-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Key'");
  });

  it('fails if the characters section contains duplicate appearance subsections with the same heading text', () => {
    const { level, errors } = _loadLevel(duplicateAppearanceSectionsText, 'general-duplicate-appearance-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Default'");
  });
});