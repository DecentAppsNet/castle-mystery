import { MarkdownLineError, normalizeMarkdownName, parseIncludedSections, parseSectionEntriesWithLines, parseSections, SectionEntryWithLine } from "@/common/markdownUtil";
import LevelFileSection from "./types/LevelFileSection";
import ErrorCollector from "./errorCollection/ErrorCollector";
import LevelFileSections from "./types/LevelFileSections";
import { assert } from "decent-portal";
import { normalizeId } from "@/game/idUtil";

const KNOWN_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'room styles', 'rooms', 'characters', 'items', 'itinerary', 'conclusions'];
const REQUIRED_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'rooms', 'characters'];
const TRIM_LEADING_BLANK_LINES_SECTION_IDS = ['itinerary'];

function _areKnownTopLevelSections(text:string, errors:ErrorCollector):boolean {
  const orginalErrorCount = errors.errorCount;
  const sectionEntries:SectionEntryWithLine[] = parseSectionEntriesWithLines(text, 1, true);
  for(let i = 0; i < sectionEntries.length; ++i) {
    const sectionEntry = sectionEntries[i];
    if (KNOWN_TOP_LEVEL_SECTION_IDS.includes(sectionEntry.name)) continue;
    const sectionId = sectionEntry.name;
    errors.addParseErrorAtLine('UNKSEC', 'a known section ID', `"${sectionId}"`, 'Check spelling.', 
      sectionEntry.lineNo, 2, 2+sectionId.length, null);
  }
  return errors.errorCount <= orginalErrorCount;
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
  const originalErrorCount = errors.errorCount;
  
  const sections:Record<string, LevelFileSection> = {};
  if (!_areKnownTopLevelSections(levelText, errors)) return null;
  const parsedSections = parseIncludedSections(levelText, KNOWN_TOP_LEVEL_SECTION_IDS, 1, true);

  errors.setLine(0); // First line will always be owned by main level file.
  const levelFilename = errors.sourceFilename;
  assert(typeof levelFilename === 'string');
  
  KNOWN_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    const sectionText = parsedSections[sectionId];
    if (!sectionText) return;
    const startLineNo = _findSectionFirstContentLineNo(levelText, sectionId) || 1;
    const text = TRIM_LEADING_BLANK_LINES_SECTION_IDS.includes(sectionId) ? _trimLeadingBlankLines(sectionText) : sectionText;
    const section:LevelFileSection = { id:sectionId, text, levelFilename, startLineNo }
    sections[sectionId] = section;
  });

  // Fail early with missing sections rather than have all the later loading code check for required sections.
  REQUIRED_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    if (!sections[sectionId]) {
      errors.addParseErrorAtLine('NOSECTION', 
        `"${sectionId}" section in level file`, `none found`, `Add the required "# ${sectionId}" section at top level.`,
        0, 0, 0, null);
    }
  });

  return errors.errorCount <= originalErrorCount ? sections : null;
}

export function getSectionIdsFromSectionText(sectionText:string, indentLevel:number, sectionId:string, errors:ErrorCollector):string[] {
  try {
    const subSections = parseSections(sectionText, indentLevel, false);
    return Object.keys(subSections).map(normalizeId);
  } catch(err:any) {
    if (err.name === 'MarkdownLineError') {
      const markdownLineError:MarkdownLineError = err;
      if (markdownLineError.message.includes('duplicate section')) {
        errors.addParseErrorAtLine('DUPEID', 'a unique section ID', 'a duplicate section', markdownLineError.message, 
          markdownLineError.lineNo, 0, 0, sectionId);
        return [];
      }
    }
    // Add handling above if it corresponds to an expected error.
    throw err;
  }
}

export function createNormalizedSectionEntryMap(sectionText:string, indentLevel:number, sectionId:string, errors:ErrorCollector):Map<string, { authoredName:string, value:string, lineNo:number }> {
  const normalizedEntries = new Map<string, { authoredName:string, value:string, lineNo:number }>();

  // First, get the section entries. It's possible that the non-normalized entries will throw a duplicate section
  // exception which is an expected condition to handle.
  let sectionEntries;
  try {
    sectionEntries = parseSectionEntriesWithLines(sectionText, indentLevel, false, errors.getSectionFirstLineNo(sectionId));
    if (!sectionEntries.length) return normalizedEntries; // No sub-sections.
  } catch (err:any) {
    const markdownLineError:MarkdownLineError = err;
    if (markdownLineError.message.includes('duplicate section')) {
      errors.addParseErrorAtLine('DUPEID', 'a unique section ID', 'a duplicate section', markdownLineError.message, 
        markdownLineError.lineNo, 0, 0, sectionId);
      return normalizedEntries;
    }
    // Add handling above if it corresponds to an expected error.
    throw err;
  }

  // Add in the entries, normalizing ID and checking for post-normalization dupes.
  sectionEntries.forEach(sectionEntry => {
    const normalizedName = normalizeId(sectionEntry.name);
    const existingEntry = normalizedEntries.get(normalizedName) || null;
    if (existingEntry) {
      errors.addParseErrorAtLine('DUPEID', 'a unique section ID', `"${sectionEntry.name}" which matches an existing section`, 
        'Make sure all section IDs are case-insensitive unique.', 0, 0, 0, sectionId);
    }
    normalizedEntries.set(normalizedName, {
      authoredName:sectionEntry.name,
      value:sectionEntry.value,
      lineNo:sectionEntry.lineNo
    });
  });

  return normalizedEntries;
}

export function isSectionRequired(sectionId:string):boolean {
  return REQUIRED_TOP_LEVEL_SECTION_IDS.includes(sectionId);
}