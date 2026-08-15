/* This module provides shared helpers for loading and making small changes to level text in tests.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { parseSectionEntriesWithLines } from '@/common/markdownUtil';
import ErrorCollector from '../errorCollection/ErrorCollector';
import SourceLineMap from '../importing/types/SourceLineMap';
import { loadLevelFromText } from '../loadLevelUtil';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
  return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

export function replaceSection(text:string, sectionName:string, replacementLines:readonly string[]):string {
  const lines = text.split('\n');
  const sections = parseSectionEntriesWithLines(text);
  const sectionI = sections.findIndex(section => section.name === sectionName);
  if (sectionI < 0) throw new Error(`section '${sectionName}' not found`);

  const bodyStartLineI = sections[sectionI].bodyStartLineI;
  const nextSection = sections[sectionI + 1];
  const bodyEndLineI = nextSection ? nextSection.bodyStartLineI - 1 : lines.length;
  lines.splice(bodyStartLineI, bodyEndLineI - bodyStartLineI, '', ...replacementLines, '');
  return lines.join('\n');
}

export function loadLevelForTest(text:string, filename:string = 'test-level.md') {
  const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
  const level = loadLevelFromText(text, errors);
  return { level, errors };
}

export function loadValidLevelForTest(text:string, filename:string = 'test-level.md') {
  const { level, errors } = loadLevelForTest(text, filename);
  if (!level || errors.hasErrors) {
    throw new Error(errors.describeErrors() || `${filename}: level loading returned no level`);
  }
  return level;
}
