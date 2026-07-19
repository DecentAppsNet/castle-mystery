/* This module groups source-mapped text creation and section-tree serialization helpers for levelLoading2 importing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { trimBodyLines } from "./importBodyTokenUtil";
import { createSourceLine } from "./importSectionTreeUtil";
import ImportedLine from "./types/ImportedLine";
import ImportedSection from "./types/ImportedSection";
import SourceMappedText from "./types/SourceMappedText";
import SourceLine from "./types/SourceLine";
import SourceLineMap from "./types/SourceLineMap";

function _createBlankLine(sourceLine:SourceLine):ImportedLine {
  return { text:'', sourceLine };
}

function _serializeSectionNode(section:ImportedSection):ImportedLine[] {
  const lines:ImportedLine[] = [{
    text:`${'#'.repeat(section.depth)} ${section.headingText}`,
    sourceLine:section.headingSourceLine
  }];
  const bodyLines = trimBodyLines(section.bodyLines);
  if (bodyLines.length) {
    lines.push(_createBlankLine(section.headingSourceLine));
    lines.push(...bodyLines);
  }
  const childLines = _serializeSectionTree(section.children);
  if (childLines.length) {
    lines.push(_createBlankLine(bodyLines[bodyLines.length - 1]?.sourceLine || section.headingSourceLine));
    lines.push(...childLines);
  }
  return lines;
}

function _serializeSectionTree(sections:ImportedSection[]):ImportedLine[] {
  const lines:ImportedLine[] = [];
  sections.forEach(section => {
    const sectionLines = _serializeSectionNode(section);
    if (!sectionLines.length) return;
    if (lines.length) lines.push(_createBlankLine(lines[lines.length - 1].sourceLine));
    lines.push(...sectionLines);
  });
  return lines;
}

export function serializeSourceMappedSections(sections:ImportedSection[]):SourceMappedText {
  const lines = _serializeSectionTree(sections);
  return createSourceMappedText(lines.map(line => line.text).join('\n'), lines.map(line => line.sourceLine));
}

export function createSourceMappedText(text:string, sourceLineMap:SourceLineMap):SourceMappedText {
  return { text, sourceLineMap };
}

export function createRawSourceMappedText(text:string, filename:string):SourceMappedText {
  return createSourceMappedText(text, text.split('\n').map((_, index) => createSourceLine(filename, index + 1)));
}