import { describe, it, expect } from 'vitest';

import inventoryInteractiveReferencedText from './fixtures/discoverability/discoverability-inventory-interactive-referenced.md?raw';
import inventoryInteractiveText from './fixtures/discoverability/discoverability-inventory-interactive.md?raw';
import inventoryNonInteractiveReferencedText from './fixtures/discoverability/discoverability-inventory-non-interactive-referenced.md?raw';
import leftHandInteractiveText from './fixtures/discoverability/discoverability-left-hand-interactive.md?raw';
import leftHandNonInteractiveText from './fixtures/discoverability/discoverability-left-hand-non-interactive.md?raw';
import minimalText from './fixtures/discoverability/discoverability-minimal.md?raw';
import nonInteractiveCharacterText from './fixtures/discoverability/discoverability-non-interactive-character.md?raw';
import rightHandInteractiveText from './fixtures/discoverability/discoverability-right-hand-interactive.md?raw';
import rightHandNonInteractiveText from './fixtures/discoverability/discoverability-right-hand-non-interactive.md?raw';
import roomItemsText from './fixtures/discoverability/discoverability-room-items.md?raw';
import twoInteractiveCharactersText from './fixtures/discoverability/discoverability-two-interactive-characters.md?raw';
import twoRoomsText from './fixtures/discoverability/discoverability-two-rooms.md?raw';
import unplacedCharacterText from './fixtures/discoverability/discoverability-unplaced-character.md?raw';
import authoredCountsText from './fixtures/discoverability/discoverability-authored-counts.md?raw';
import initialSkinText from './fixtures/discoverability/discoverability-initial-skin.md?raw';
import repeatedAppearancesText from './fixtures/discoverability/discoverability-repeated-appearances.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('loading levels - discoverability', () => {
  it('counts a custom initial skin once, excluding unused skins and unplaced or non-interactive characters', () => {
    const { level, errors } = loadLevelForTest(initialSkinText);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('counts default when an activity reaches it after a custom initial skin', () => {
    const text = replaceSection(initialSkinText, 'itinerary', ['0:00:05 Sam appears default']);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(2);
  });

  it('does not count an activity selecting the initial custom skin twice', () => {
    const text = replaceSection(initialSkinText, 'itinerary', ['0:00:05 Sam appears Detective']);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('counts two selected custom skins without adding an unseen default', () => {
    const text = replaceSection(initialSkinText, 'itinerary', ['0:00:05 Sam appears Guard']);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(2);
  });

  it('deduplicates repeated named and default selections', () => {
    const { level, errors } = loadLevelForTest(repeatedAppearancesText);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(3);
  });

  it('excludes selected appearances of placed non-interactive characters', () => {
    const text = replaceSection(initialSkinText, 'itinerary', ['0:00:05 Alex appears default']);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('preserves authored count overrides with a custom initial skin', () => {
    const text = initialSkinText.replace('* activeCharacter=Sam', '* discoverableCharacterCount=7');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(7);
  });

  it('loads one discoverable character and room from a minimal level with no itinerary', () => {
    const { level, errors } = loadLevelForTest(minimalText, 'discoverability-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
    expect(level?.discoveryConfig.discoverableRoomCount).toBe(1);
  });

  it('excludes defined skins not referenced in the itinerary', () => {
    const text = replaceSection(minimalText, 'characters', [
      '## Sam',
      '* description=An alert detective.',
      '',
      '### Detective',
      '',
      '### Guard'
    ]);
    const { level, errors } = loadLevelForTest(text, 'discoverability-character-skins.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('counts each defined skin referenced in an appearance activity', () => {
    const textWithSkins = replaceSection(minimalText, 'characters', [
      '## Sam',
      '* description=An alert detective.',
      '',
      '### Detective',
      '',
      '### Guard'
    ]);
    const text = replaceSection(textWithSkins, 'itinerary', ['0:00:05 Sam appears Detective']);
    const { level, errors } = loadLevelForTest(text, 'discoverability-referenced-character-skin.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(2);
  });

  it('loads two discoverable placed interactive characters', () => {
    const { level, errors } = loadLevelForTest(twoInteractiveCharactersText, 'discoverability-two-interactive-characters.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(2);
  });

  it('excludes an unplaced interactive character from discoverable characters', () => {
    const { level, errors } = loadLevelForTest(unplacedCharacterText, 'discoverability-unplaced-character.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('excludes a placed non-interactive character from discoverable characters', () => {
    const { level, errors } = loadLevelForTest(nonInteractiveCharacterText, 'discoverability-non-interactive-character.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(1);
  });

  it('includes an interactive item placed in a room', () => {
    const { level, errors } = loadLevelForTest(roomItemsText, 'discoverability-room-items.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item placed in a room', () => {
    const { level, errors } = loadLevelForTest(roomItemsText, 'discoverability-room-items.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(1);
  });

  it('excludes an interactive inventory item not referenced in the itinerary', () => {
    const { level, errors } = loadLevelForTest(inventoryInteractiveText, 'discoverability-inventory-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(0);
  });

  it('includes an interactive inventory item referenced in the itinerary', () => {
    const { level, errors } = loadLevelForTest(inventoryInteractiveReferencedText, 'discoverability-inventory-interactive-referenced.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive inventory item referenced in the itinerary', () => {
    const { level, errors } = loadLevelForTest(inventoryNonInteractiveReferencedText, 'discoverability-inventory-non-interactive-referenced.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(0);
  });

  it('includes an interactive item held in a character left hand', () => {
    const { level, errors } = loadLevelForTest(leftHandInteractiveText, 'discoverability-left-hand-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item held in a character left hand', () => {
    const { level, errors } = loadLevelForTest(leftHandNonInteractiveText, 'discoverability-left-hand-non-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(0);
  });

  it('includes an interactive item held in a character right hand', () => {
    const { level, errors } = loadLevelForTest(rightHandInteractiveText, 'discoverability-right-hand-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item held in a character right hand', () => {
    const { level, errors } = loadLevelForTest(rightHandNonInteractiveText, 'discoverability-right-hand-non-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(0);
  });

  it('loads two discoverable rooms', () => {
    const { level, errors } = loadLevelForTest(twoRoomsText, 'discoverability-two-rooms.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableRoomCount).toBe(2);
  });

  it('uses the authored discoverable room count instead of the calculated count', () => {
    const { level, errors } = loadLevelForTest(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableRoomCount).toBe(5);
  });

  it('uses the authored discoverable character count instead of the calculated count', () => {
    const { level, errors } = loadLevelForTest(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableCharacterCount).toBe(3);
  });

  it('uses the authored discoverable item count instead of the calculated count', () => {
    const { level, errors } = loadLevelForTest(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoveryConfig.discoverableItemCount).toBe(4);
  });
});