import { MarkdownLineError, normalizeMarkdownName, parseIncludedSections, parseSectionEntriesWithLines } from "@/common/markdownUtil";
import { runWithLevelFileContext } from "./runWithContextUtil";
import LevelFileSection from "./types/LevelFileSection";

const KNOWN_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'room styles', 'rooms', 'characters', 'items', 'itinerary', 'conclusions'];
const TRIM_LEADING_BLANK_LINES_SECTION_IDS = ['itinerary'];

function _validateKnownTopLevelSections(text:string) {
  parseSectionEntriesWithLines(text, 1, true).forEach(sectionEntry => {
    if (KNOWN_TOP_LEVEL_SECTION_IDS.includes(sectionEntry.name)) return;
    throw new MarkdownLineError(sectionEntry.lineNo, `unknown top-level section '${sectionEntry.name}'`);
  });
}

function _findSectionFirstContentLineNo(markdownText:string, sectionName:string, indentLevel:number = 1):number|null {
  const lines = markdownText.split('\n');
  const normalizedSectionName = normalizeMarkdownName(sectionName);
  const headingIndex = lines.findIndex(line => {
    const trimmedLeftLine = line.trimStart();
    const prefix = '#'.repeat(indentLevel);
    if (!trimmedLeftLine.startsWith(prefix)) return false;
    if (trimmedLeftLine.length === prefix.length) return false;
    const nextChar = trimmedLeftLine[prefix.length];
    if (nextChar !== ' ' && nextChar !== '\t') return false;
    return normalizeMarkdownName(trimmedLeftLine.slice(prefix.length).trim()) === normalizedSectionName;
  });
  if (headingIndex === -1) return null;

  for (let i = headingIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith('#'.repeat(indentLevel) + ' ')) return null;
    if (trimmedLine.length > 0) return i + 1;
  }

  return null;
}

function _trimLeadingBlankLines(text:string):string {
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  return lines.join('\n');
}

export function loadLevelSections(levelText:string, levelFilename:string):Record<string, LevelFileSection> {
  const sections:Record<string, LevelFileSection> = {};
  runWithLevelFileContext(levelFilename, 1, () => _validateKnownTopLevelSections(levelText));
  const parsedSections = runWithLevelFileContext(levelFilename, 1, () => parseIncludedSections(levelText, KNOWN_TOP_LEVEL_SECTION_IDS, 1, true));
  KNOWN_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    const firstLineNo = _findSectionFirstContentLineNo(levelText, sectionId) || 1;
    const nonEmptyText = parsedSections[sectionId] || '';
    const text = TRIM_LEADING_BLANK_LINES_SECTION_IDS.includes(sectionId) ? _trimLeadingBlankLines(nonEmptyText) : nonEmptyText;
    const runWithContext = (func:Function) => runWithLevelFileContext(levelFilename, firstLineNo, func);
    sections[sectionId] = { id:sectionId, levelFilename, firstLineNo, text, runWithContext };
  });
  return sections;
}