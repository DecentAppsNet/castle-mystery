import { assertNonNullable } from "decent-portal";
import SourceLineMap from "../importing/types/SourceLineMap";
import { parseSectionEntriesWithLines } from "@/common/markdownUtil";
import { normalizeId } from "@/game/idUtil";
import { collapseWhitespace } from "@/common/regExUtil";

export const FULL_LINE_MATCH = '';
export const FIRST_SECTION_LINE = '';
export const ROOT_LEVEL = '';

function _findSectionRecursively(text:string, indentLevel:number, sectionNames:string[], firstLineI = 0):{sectionText:string, lineIOffset:number}|null {
  const sections = parseSectionEntriesWithLines(text, indentLevel, false, firstLineI + 1);
  const sectionId:string = normalizeId(sectionNames[0]);
  const section = sections.find(entry => normalizeId(entry.name) === sectionId) ?? null;
  if (!section) return null;

  sectionNames = sectionNames.slice(1);
  const sectionBodyStartLineI = section.bodyStartLineI;
  if (!sectionNames.length) return {sectionText:section.value, lineIOffset:sectionBodyStartLineI};

  return _findSectionRecursively(section.value, indentLevel+1, sectionNames, sectionBodyStartLineI);
}

function _matchCharRange(line:string, charRangeCriteria:string):{fromCharNo:number, toCharNo:number} {
  if (charRangeCriteria === FULL_LINE_MATCH) return {fromCharNo:0, toCharNo:line.length};
  let toCharNo;
  let fromCharNo = line.indexOf(charRangeCriteria);
  if (fromCharNo === -1) {
    fromCharNo = 0;
    toCharNo = line.length;
  } else {
    toCharNo = fromCharNo + charRangeCriteria.length;
  }
  return { fromCharNo, toCharNo };
}

function _findSectionLine(sectionText:string, lineCriteria:string):{lineI:number, line:string} {
  let line:string = '', lineI:number;
  const lines = sectionText.split('\n');
  if (lineCriteria === FIRST_SECTION_LINE) return { lineI:0, line:lines[0] };
    
  for(lineI = 0; lineI < lines.length; ++lineI) {
    line = lines[lineI];
    if (line.includes(lineCriteria)) break;
  }
  if (lineI < lines.length) return {line, lineI}

  // Do another check with normalized lines. (More expensive than first-pass check)
  for(lineI = 0; lineI < lines.length; ++lineI) {
    line = lines[lineI];
    const evalLine = collapseWhitespace(line);
    if (evalLine.includes(lineCriteria)) break;
  }
  if (lineI < lines.length) return {line, lineI}
  return { line:'', lineI:0 }
}

function _findSection(sourceText:string, sectionNames:string[]|string):{sectionText:string, lineIOffset:number} {
  if (sectionNames === ROOT_LEVEL) return { sectionText:sourceText, lineIOffset:0 };
  if (typeof sectionNames === 'string') sectionNames = [sectionNames];
  const section = _findSectionRecursively(sourceText, 1, sectionNames)
  return section ? section : { sectionText:sourceText, lineIOffset:0 };
}

export function matchLine(sourceText:string, sectionNames:string[]|string, sourceLineMap:SourceLineMap, lineCriteria:string, charRangeCriteria:string):
    {sourceFilename:string, sourceLineNo:number, fromCharNo:number, toCharNo:number} {
  // Get section text.
  const section = _findSection(sourceText, sectionNames) 
    ?? { sectionText:sourceText, lineIOffset:0 };
  const sectionText = section.sectionText;

  // Get line.
  const { lineIOffset } = section;
  const {lineI:sectionLineI, line } = _findSectionLine(sectionText, lineCriteria);
  const lineI = sectionLineI + lineIOffset;
  assertNonNullable(sourceLineMap[lineI]);
  const { filename:sourceFilename, lineNo:sourceLineNo } = sourceLineMap[lineI];
  
  // Get char range.
  assertNonNullable(line);
  const { fromCharNo, toCharNo } = _matchCharRange(line, charRangeCriteria);

  return { sourceFilename, sourceLineNo, fromCharNo, toCharNo };
}

export function findLineLength(sourceText:string, lineI:number):number {
  const lines = sourceText.split('\n');
  const line = lines[lineI];
  return line ? line.length : 0;
}