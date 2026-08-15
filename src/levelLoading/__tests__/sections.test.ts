import { describe, it, expect } from 'vitest';
import allCapsText from './fixtures/sections/sections-all-caps.md?raw';
import minimalOptionalMissingText from './fixtures/sections/sections-minimal-optional-missing.md?raw';
import missingCharactersText from './fixtures/sections/sections-missing-characters.md?raw';
import missingGeneralText from './fixtures/sections/sections-missing-general.md?raw';
import missingMapText from './fixtures/sections/sections-missing-map.md?raw';
import missingRoomsText from './fixtures/sections/sections-missing-rooms.md?raw';
import unknownTopLevelText from './fixtures/sections/sections-unknown-top-level.md?raw';
import levelTimesBaseText from './fixtures/level-times-base.md?raw';
import { loadLevelForTest } from './testLevelUtil';
import { loadLevelSections } from '../levelFileSectionUtil';
import { ErrorCollector } from '../errorCollection';
import { assertNonNullable } from 'decent-portal';

describe('loading levels - sections', () => {
  it('fails if required "general" section is missing', () => {
    const { level, errors } = loadLevelForTest(missingGeneralText, 'sections-missing-general.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "general" section in level file.');
  });

  it('fails if required "map" section is missing', () => {
    const { level, errors } = loadLevelForTest(missingMapText, 'sections-missing-map.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "map" section in level file.');
  });

  it('fails if required "characters" section is missing', () => {
    const { level, errors } = loadLevelForTest(missingCharactersText, 'sections-missing-characters.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "characters" section in level file.');
  });

  it('fails if required "rooms" section is missing', () => {
    const { level, errors } = loadLevelForTest(missingRoomsText, 'sections-missing-rooms.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "rooms" section in level file.');
  });

  it('fails if unknown top-level section included', () => {
    const { level, errors } = loadLevelForTest(unknownTopLevelText, 'sections-unknown-top-level.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"mystery" is not a known top-level section name.');
  });

  it('loads a minimal level with optional sections missing', () => {
    const { level, errors } = loadLevelForTest(minimalOptionalMissingText, 'sections-minimal-optional-missing.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('loads a minimal level with section names in all caps', () => {
    const { level, errors } = loadLevelForTest(allCapsText, 'sections-all-caps.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('preserves top-level section text without trimming leading blank lines', () => {
    const sourceLineMap = levelTimesBaseText.split('\n').map((_, lineI) => ({ filename:'level-times-base.md', lineNo:lineI + 1 }));
    const errors = new ErrorCollector(levelTimesBaseText, sourceLineMap);

    const sections = loadLevelSections(levelTimesBaseText, errors);

    expect(errors.describeErrors()).toBe('');
    expect(sections?.itinerary.text).toBe('\n0:00:03 Sam sits\n');
  });

  it('locates raw section bodies by zero-based combined line index', () => {
    const lines = levelTimesBaseText.split('\n');
    const itineraryHeadingI = lines.findIndex(line => line === '# itinerary');
    const conclusionsHeadingI = lines.findIndex(line => line === '# conclusions');
    const sourceLineMap = lines.map((_, lineI) => ({
      filename:lineI > itineraryHeadingI && lineI < conclusionsHeadingI ? 'itinerary.md' : 'level-times-base.md',
      lineNo:lineI + 1
    }));
    const errors = new ErrorCollector(levelTimesBaseText, sourceLineMap);

    const sections = loadLevelSections(levelTimesBaseText, errors);

    expect(errors.describeErrors()).toBe('');
    assertNonNullable(sections);
    expect(sections.itinerary.lineI).toBe(itineraryHeadingI + 1);
    expect(sections.itinerary.text).toBe(lines.slice(sections.itinerary.lineI, conclusionsHeadingI).join('\n'));
  });
});