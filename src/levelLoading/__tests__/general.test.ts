import { describe, it, expect } from 'vitest';
import defaultLevelText from './fixtures/general-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('loading levels - general section', () => {
  it('loads default general-derived values into the returned level when optional properties are omitted', () => {
    const { level, errors } = loadLevelForTest(defaultLevelText, 'general-minimal-missing-values.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.winSynopsis).toBe('You won the level!');
    expect(level?.backgroundImageUrl).toBeNull();
    expect(level?.groundFloorY).toBe(20);
    expect(level?.activeCharacterId).toBe('sam');
  });

  it('loads the general values that are currently projected onto the returned level', () => {
    const text = replaceSection(defaultLevelText, 'general', [
      '* activeCharacter=Sam',
      '* discoverableCharacterCount=3',
      '* discoverableItemCount=4',
      '* discoverableRoomCount=5',
      '* winSynopsis=Case closed.',
      '* background=castle.png',
      '* groundFloorRoom=Hall'
    ]);
    const { level, errors } = loadLevelForTest(text, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.winSynopsis).toBe('Case closed.');
    expect(level?.backgroundImageUrl).toBe('/assets/backgrounds/castle.png');
    expect(level?.groundFloorY).toBe(20);
  });

  it('fails if discoverableCharacterCount is specified and contains a non-integer value', () => {
    const text = replaceSection(defaultLevelText, 'general', [
      '* activeCharacter=Sam',
      '* discoverableCharacterCount=1.5'
    ]);
    const { level, errors } = loadLevelForTest(text, 'general-invalid-discoverable-character-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"1.5" is not an integer.');
  });

  it('fails if discoverableItemCount is specified and contains a negative value', () => {
    const text = replaceSection(defaultLevelText, 'general', [
      '* activeCharacter=Sam',
      '* discoverableItemCount=-1'
    ]);
    const { level, errors } = loadLevelForTest(text, 'general-invalid-discoverable-item-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"-1" is not an integer.');
  });

  it('fails if discoverableRoomCount is specified and contains a non-numeric value', () => {
    const text = replaceSection(defaultLevelText, 'general', [
      '* activeCharacter=Sam',
      '* discoverableRoomCount=abc'
    ]);
    const { level, errors } = loadLevelForTest(text, 'general-invalid-discoverable-room-count.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"NaN" is not an integer.');
  });

  it('fails if the rooms section contains duplicate room subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'rooms', ['## Hall', '', '## Hall']);
    const { level, errors } = loadLevelForTest(text, 'general-duplicate-room-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Hall'");
  });

  it('fails if the characters section contains duplicate character subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'characters', [
      '## Sam',
      '### Default',
      '',
      '## Sam',
      '### Second'
    ]);
    const { level, errors } = loadLevelForTest(text, 'general-duplicate-character-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Sam'");
  });

  it('fails if the items section contains duplicate item subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Key', '', '## Key']);
    const { level, errors } = loadLevelForTest(text, 'general-duplicate-item-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Key'");
  });

  it('fails if the characters section contains duplicate skin subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'characters', ['## Sam', '### Default', '', '### Default']);
    const { level, errors } = loadLevelForTest(text, 'general-duplicate-skin-sections.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Default'");
  });
});