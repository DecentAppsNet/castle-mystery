import { test, expect } from 'vitest';

import ErrorCollector from '../errorCollection/ErrorCollector';
import { loadLevelFromText } from '../loadLevelUtil';
import defaultLevelText from './fixtures/default-level.md?raw';
import SourceLineMap from '../importing/types/SourceLineMap';

// Temporary test file used during development. To be deleted later.

function _createNonImportAwareSourceLineMap(text:string, filename:string):SourceLineMap {
  const lines = text.split('\n');
  const slm:SourceLineMap = lines.map((_, index) => {
     return {filename, lineNo:index + 1}; 
  });
  return slm;
}

function _loadLevel(levelFileText:string, filename:string) {
  const sourceLineMap = _createNonImportAwareSourceLineMap(levelFileText, filename);
  const errors = new ErrorCollector(levelFileText, sourceLineMap);
  return loadLevelFromText(levelFileText, errors);
}

test('load default level', () => {
  const level = _loadLevel(defaultLevelText, 'default-level.md');
  expect(level).not.toBeNull();
});