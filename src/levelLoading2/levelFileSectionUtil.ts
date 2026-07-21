import { normalizeMarkdownName, parseIncludedSections, parseSectionEntriesWithLines, SectionEntryWithLine } from "@/common/markdownUtil";
import LevelFileSection from "./types/LevelFileSection";
import ErrorCollector from "./errorCollection/ErrorCollector";
import LevelFileSections from "./types/LevelFileSections";
import { assert } from "decent-portal";

const KNOWN_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'room styles', 'rooms', 'characters', 'items', 'itinerary', 'conclusions'];
const TRIM_LEADING_BLANK_LINES_SECTION_IDS = ['itinerary'];

function _areKnownTopLevelSections(text:string, errors:ErrorCollector):boolean {
  errors.resetNewErrors();
  const sectionEntries:SectionEntryWithLine[] = parseSectionEntriesWithLines(text, 1, true);
  for(let i = 0; i < sectionEntries.length; ++i) {
    const sectionEntry = sectionEntries[i];
    if (KNOWN_TOP_LEVEL_SECTION_IDS.includes(sectionEntry.name)) continue;
    const sectionId = sectionEntry.name;
    errors.addParseErrorAtLine('UNKSEC', 'a known section ID', `"${sectionId}"`, 'Check spelling.', 
      sectionEntry.lineNo, 2, 2+sectionId.length, null);
  }
  return !errors.hasNewErrors();
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

export function loadLevelSections(levelText:string, errors:ErrorCollector):LevelFileSections|null {
  const sections:Record<string, LevelFileSection> = {};
  
  errors.resetNewErrors();
  if (!_areKnownTopLevelSections(levelText, errors)) return null;
  const parsedSections = parseIncludedSections(levelText, KNOWN_TOP_LEVEL_SECTION_IDS, 1, true);

  errors.setLine(0); // First line will always be owned by main level file.
  const levelFilename = errors.sourceFilename;
  assert(typeof levelFilename === 'string');
  
  KNOWN_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    const startLineNo = _findSectionFirstContentLineNo(levelText, sectionId) || 1;
    const nonEmptyText = parsedSections[sectionId] || '';
    const text = TRIM_LEADING_BLANK_LINES_SECTION_IDS.includes(sectionId) ? _trimLeadingBlankLines(nonEmptyText) : nonEmptyText;
    const section:LevelFileSection = { id:sectionId, text, levelFilename, startLineNo }
    sections[sectionId] = section;
  });

  return errors.hasNewErrors() ? null : sections;
}