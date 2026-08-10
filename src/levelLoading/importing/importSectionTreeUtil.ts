/* This module groups markdown heading parsing and section-tree construction helpers for levelLoading2 importing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { normalizeId } from "@/game/idUtil";
import SourceMappedText from "./types/SourceMappedText";
import ImportedSection from "./types/ImportedSection";
import SourceLine from "./types/SourceLine";

function _findMarkdownHeadingLine(line:string):{ depth:number, headingText:string }|null {
  let index = 0;
  while (index < line.length && (line[index] === ' ' || line[index] === '\t')) ++index;

  const headingStartIndex = index;
  while (index < line.length && line[index] === '#') ++index;
  if (index === headingStartIndex) return null;
  const depth = index - headingStartIndex;

  const whitespaceStartIndex = index;
  while (index < line.length && (line[index] === ' ' || line[index] === '\t')) ++index;
  if (index === whitespaceStartIndex) return null;

  const headingText = line.slice(index).trim();
  if (!headingText.length) return null;
  return { depth, headingText };
}

export function createSection(headingText:string):ImportedSection {
  return {
    headingText,
    normalizedHeading:normalizeId(headingText),
    depth:1,
    headingSourceLine:{ filename:'<unknown>', lineNo:1 },
    bodyLines:[],
    children:[]
  };
}

export function createSourceLine(filename:string, lineNo:number):SourceLine {
  return { filename, lineNo };
}

export function parseSectionTree(sourceMappedText:SourceMappedText):ImportedSection[] {
  const roots:ImportedSection[] = [];
  const stack:Array<{ depth:number, section:ImportedSection }> = [];

  const lines = sourceMappedText.text.split('\n');
  lines.forEach((line, index) => {
    const sourceLine = sourceMappedText.sourceLineMap[index] || createSourceLine('<unknown>', index + 1);
    const heading = _findMarkdownHeadingLine(line);
    if (heading) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) stack.pop();
      const section = {
        ...createSection(heading.headingText),
        depth:heading.depth,
        headingSourceLine:sourceLine
      };
      const parentSection = stack[stack.length - 1]?.section || null;
      if (parentSection) parentSection.children.push(section);
      else roots.push(section);
      stack.push({ depth:heading.depth, section });
      return;
    }

    const currentSection = stack[stack.length - 1]?.section || null;
    if (!currentSection) return;
    currentSection.bodyLines.push({ text:line, sourceLine });
  });

  return roots;
}