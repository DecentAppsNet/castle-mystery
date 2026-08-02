import { describe, it, expect } from 'vitest';
import ErrorCollector from '../errorCollection/ErrorCollector';
import SourceLineMap from '../importing/types/SourceLineMap';
import { loadLevelFromText } from '../loadLevelUtil';
import allCapsText from './fixtures/sections-all-caps.md?raw';
import minimalOptionalMissingText from './fixtures/sections-minimal-optional-missing.md?raw';
import missingCharactersText from './fixtures/sections-missing-characters.md?raw';
import missingGeneralText from './fixtures/sections-missing-general.md?raw';
import missingMapText from './fixtures/sections-missing-map.md?raw';
import missingRoomsText from './fixtures/sections-missing-rooms.md?raw';
import unknownTopLevelText from './fixtures/sections-unknown-top-level.md?raw';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
  return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

function _loadLevel(text:string, filename:string) {
  const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
  const level = loadLevelFromText(text, errors);
  return { level, errors };
}

describe('loading levels - sections', () => {
  it('fails if required "general" section is missing', () => {
    const { level, errors } = _loadLevel(missingGeneralText, 'sections-missing-general.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "general" section in level file.');
  });

  it('fails if required "map" section is missing', () => {
    const { level, errors } = _loadLevel(missingMapText, 'sections-missing-map.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "map" section in level file.');
  });

  it('fails if required "characters" section is missing', () => {
    const { level, errors } = _loadLevel(missingCharactersText, 'sections-missing-characters.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "characters" section in level file.');
  });

  it('fails if required "rooms" section is missing', () => {
    const { level, errors } = _loadLevel(missingRoomsText, 'sections-missing-rooms.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Missing required "rooms" section in level file.');
  });

  it('fails if unknown top-level section included', () => {
    const { level, errors } = _loadLevel(unknownTopLevelText, 'sections-unknown-top-level.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"mystery" is not a known top-level section name.');
  });

  it('loads a minimal level with optional sections missing', () => {
    const { level, errors } = _loadLevel(minimalOptionalMissingText, 'sections-minimal-optional-missing.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('loads a minimal level with section names in all caps', () => {
    const { level, errors } = _loadLevel(allCapsText, 'sections-all-caps.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });
});