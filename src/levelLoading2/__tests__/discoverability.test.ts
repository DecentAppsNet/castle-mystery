import { describe, it, expect } from 'vitest';

import ErrorCollector from "../errorCollection/ErrorCollector";
import SourceLineMap from "../importing/types/SourceLineMap";
import { loadLevelFromText } from "../loadLevelUtil";
import inventoryInteractiveReferencedText from './fixtures/discoverability-inventory-interactive-referenced.md?raw';
import inventoryInteractiveText from './fixtures/discoverability-inventory-interactive.md?raw';
import inventoryNonInteractiveReferencedText from './fixtures/discoverability-inventory-non-interactive-referenced.md?raw';
import leftHandInteractiveText from './fixtures/discoverability-left-hand-interactive.md?raw';
import leftHandNonInteractiveText from './fixtures/discoverability-left-hand-non-interactive.md?raw';
import minimalText from './fixtures/discoverability-minimal.md?raw';
import nonInteractiveCharacterText from './fixtures/discoverability-non-interactive-character.md?raw';
import rightHandInteractiveText from './fixtures/discoverability-right-hand-interactive.md?raw';
import rightHandNonInteractiveText from './fixtures/discoverability-right-hand-non-interactive.md?raw';
import roomItemsText from './fixtures/discoverability-room-items.md?raw';
import twoInteractiveCharactersText from './fixtures/discoverability-two-interactive-characters.md?raw';
import twoRoomsText from './fixtures/discoverability-two-rooms.md?raw';
import unplacedCharacterText from './fixtures/discoverability-unplaced-character.md?raw';
import authoredCountsText from './fixtures/general-success-populated.md?raw';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
  return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

function _loadLevel(text:string, filename:string) {
  const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
  const level = loadLevelFromText(text, errors);
  return { level, errors };
}

describe('loading levels - discoverability', () => {
  it('loads one discoverable character and room from a minimal level with no itinerary', () => {
    const { level, errors } = _loadLevel(minimalText, 'discoverability-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(1);
    expect(level?.discoverableRoomCount).toBe(1);
  });

  it('loads two discoverable placed interactive characters', () => {
    const { level, errors } = _loadLevel(twoInteractiveCharactersText, 'discoverability-two-interactive-characters.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(2);
  });

  it('excludes an unplaced interactive character from discoverable characters', () => {
    const { level, errors } = _loadLevel(unplacedCharacterText, 'discoverability-unplaced-character.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(1);
  });

  it('excludes a placed non-interactive character from discoverable characters', () => {
    const { level, errors } = _loadLevel(nonInteractiveCharacterText, 'discoverability-non-interactive-character.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(1);
  });

  it('includes an interactive item placed in a room', () => {
    const { level, errors } = _loadLevel(roomItemsText, 'discoverability-room-items.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item placed in a room', () => {
    const { level, errors } = _loadLevel(roomItemsText, 'discoverability-room-items.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(1);
  });

  it('excludes an interactive inventory item not referenced in the itinerary', () => {
    const { level, errors } = _loadLevel(inventoryInteractiveText, 'discoverability-inventory-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(0);
  });

  it('includes an interactive inventory item referenced in the itinerary', () => {
    const { level, errors } = _loadLevel(inventoryInteractiveReferencedText, 'discoverability-inventory-interactive-referenced.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive inventory item referenced in the itinerary', () => {
    const { level, errors } = _loadLevel(inventoryNonInteractiveReferencedText, 'discoverability-inventory-non-interactive-referenced.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(0);
  });

  it('includes an interactive item held in a character left hand', () => {
    const { level, errors } = _loadLevel(leftHandInteractiveText, 'discoverability-left-hand-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item held in a character left hand', () => {
    const { level, errors } = _loadLevel(leftHandNonInteractiveText, 'discoverability-left-hand-non-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(0);
  });

  it('includes an interactive item held in a character right hand', () => {
    const { level, errors } = _loadLevel(rightHandInteractiveText, 'discoverability-right-hand-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(1);
  });

  it('excludes a non-interactive item held in a character right hand', () => {
    const { level, errors } = _loadLevel(rightHandNonInteractiveText, 'discoverability-right-hand-non-interactive.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(0);
  });

  it('loads two discoverable rooms', () => {
    const { level, errors } = _loadLevel(twoRoomsText, 'discoverability-two-rooms.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableRoomCount).toBe(2);
  });

  it('uses the authored discoverable room count instead of the calculated count', () => {
    const { level, errors } = _loadLevel(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableRoomCount).toBe(5);
  });

  it('uses the authored discoverable character count instead of the calculated count', () => {
    const { level, errors } = _loadLevel(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableCharacterCount).toBe(3);
  });

  it('uses the authored discoverable item count instead of the calculated count', () => {
    const { level, errors } = _loadLevel(authoredCountsText, 'general-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.discoverableItemCount).toBe(4);
  });
});