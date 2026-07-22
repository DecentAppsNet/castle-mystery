import { test, expect } from 'vitest';

import ErrorCollector from '../errorCollection/ErrorCollector';
import { loadLevelFromText } from '../loadLevelUtil';
import defaultLevelText from './fixtures/default-level.md?raw';
import SourceLineMap from '../importing/types/SourceLineMap';
import SectionIdToLineOffset from '../errorCollection/types/SectionIdToLineOffset';

// Temporary test file used during development. To be deleted later.

function _createNonImportAwareSourceLineMap(text:string, filename:string):SourceLineMap {
  const lines = text.split('\n');
  const slm:SourceLineMap = lines.map((_, index) => {
     return {filename, lineNo:index + 1}; 
  });
  return slm;
}

function _findSectionStartLineNo(lines:string[], sectionId:string):number {
  const seekSection = `# ${sectionId}`;
  for(let lineI = 0; lineI < lines.length; ++lineI) {
    if (lines[lineI].trim() === seekSection) return lineI + 1;
  }
  return -1;
}

function _createSectionOffsets(text:string):SectionIdToLineOffset {
  const lines = text.split('\n');
  const s:SectionIdToLineOffset = {};
  ['general', 'map', 'characters', 'rooms', 'items', 'conclusions', 'room styles', 'itinerary'].forEach(sectionId => {
    s[sectionId] = _findSectionStartLineNo(lines, sectionId);
  });
  return s;
}

function _loadLevel(levelFileText:string, filename:string) {
  const sourceLineMap = _createNonImportAwareSourceLineMap(levelFileText, filename);
  const sectionOffsets = _createSectionOffsets(levelFileText);
  const errors = new ErrorCollector(sectionOffsets, sourceLineMap);
  return loadLevelFromText(levelFileText, errors);
}

test('load default level', () => {
  const level = _loadLevel(defaultLevelText, 'default-level.md');
  expect(level).not.toBeNull();
});