import { MarkdownLineError, normalizeMarkdownName, parseIncludedSections, parseSectionEntriesWithLines, parseSections, SectionEntryWithLine } from "@/common/markdownUtil";
import LevelFileSection from "./types/LevelFileSection";
import ErrorCollector from "./errorCollection/ErrorCollector";
import LevelFileSections from "./types/LevelFileSections";
import { normalizeId } from "@/game/idUtil";
import SectionEntryMap from "./types/SectionEntryMap";
import { ROOT_LEVEL } from "./errorCollection/sourceLocationUtil";

const KNOWN_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'room styles', 'rooms', 'characters', 'items', 'itinerary', 'conclusions'];
const REQUIRED_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'rooms', 'characters'];
const TRIM_LEADING_BLANK_LINES_SECTION_IDS = ['itinerary'];

function _areKnownTopLevelSections(text:string, errors:ErrorCollector):boolean {
  const orginalErrorCount = errors.count;
  const sectionEntries:SectionEntryWithLine[] = parseSectionEntriesWithLines(text, 1, true);
  for(let i = 0; i < sectionEntries.length; ++i) {
    const sectionEntry = sectionEntries[i];
    if (KNOWN_TOP_LEVEL_SECTION_IDS.includes(sectionEntry.name)) continue;
    const sectionName = sectionEntry.name;
    errors.addAt(`"${sectionName}" is not a known top-level section name.`, ROOT_LEVEL, `# ${sectionName}`);
  }
  return errors.count <= orginalErrorCount;
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
  const originalErrorCount = errors.count;
  
  const sections:Record<string, LevelFileSection> = {};
  if (!_areKnownTopLevelSections(levelText, errors)) return null;
  const parsedSections = parseIncludedSections(levelText, KNOWN_TOP_LEVEL_SECTION_IDS, 1, true);
  
  KNOWN_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    const sectionText = parsedSections[sectionId];
    if (!sectionText) return;
    const startLineNo = _findSectionFirstContentLineNo(levelText, sectionId) || 1;
    const text = TRIM_LEADING_BLANK_LINES_SECTION_IDS.includes(sectionId) ? _trimLeadingBlankLines(sectionText) : sectionText;
    const section:LevelFileSection = { id:sectionId, text, startLineNo }
    sections[sectionId] = section;
  });

  // Fail early with missing sections rather than have all the later loading code check for required sections.
  REQUIRED_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    if (!sections[sectionId]) errors.addAt(`Missing required "${sectionId}" section in level file.`, ROOT_LEVEL);
  });

  return errors.count <= originalErrorCount ? sections : null;
}

export function getSectionIdsFromSectionText(sectionText:string, indentLevel:number, sectionId:string, errors:ErrorCollector):string[] {
  try {
    const subSections = parseSections(sectionText, indentLevel, false);
    return Object.keys(subSections).map(normalizeId);
  } catch(err:any) {
    if (err.name === 'MarkdownLineError') {
      const markdownLineError:MarkdownLineError = err;
      if (markdownLineError.message.includes('duplicate section')) {
        errors.addAt(markdownLineError.message, sectionId);
        return [];
      }
    }
    // Add handling above if it corresponds to an expected error.
    throw err;
  }
}

export function createNormalizedSectionEntryMap(sectionText:string, indentLevel:number, sectionId:string, 
    errors:ErrorCollector):SectionEntryMap {
  const normalizedEntries = new Map<string, SectionEntryWithLine>();

  // First, get the section entries. It's possible that the non-normalized entries will throw a duplicate section
  // exception which is an expected condition to handle.
  let sectionEntries;
  try {
    sectionEntries = parseSectionEntriesWithLines(sectionText, indentLevel, false);
    if (!sectionEntries.length) return normalizedEntries; // No sub-sections.
  } catch (err:any) {
    const markdownLineError:MarkdownLineError = err;
    if (markdownLineError.message.includes('duplicate section')) {
      errors.addAt(markdownLineError.message, sectionId);
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
      errors.addAt(`After normalization, 
        "${sectionEntry.name}" has same name as another. Make sure all section anmes are case-insensitive unique.`, 
        sectionId);
    }
    normalizedEntries.set(normalizedName, {
      name:sectionEntry.name,
      value:sectionEntry.value,
      lineNo:sectionEntry.lineNo
    });
  });

  return normalizedEntries;
}

export function isSectionRequired(sectionId:string):boolean {
  return REQUIRED_TOP_LEVEL_SECTION_IDS.includes(sectionId);
}

const TRUE_VALUES = ['true','t','yes','y','on'];
const FALSE_VALUES = ['false', 'f', 'no', 'n', 'off'];
export function parseBoolean(value:string, errors:ErrorCollector, sectionNames:string[], variableName:string):boolean {
  value = value.trim().toLowerCase();
  if (TRUE_VALUES.includes(value)) return true;
  if (FALSE_VALUES.includes(value)) return false;
  errors.addAt(`Expected "${value}" to be "true" or "false"`, sectionNames, `* ${variableName}=`, value);
  return false;
}

export function parseNumber(value:string, errors:ErrorCollector, sectionNames:string[], variableName:string):number {
  const numberValue = Number.parseFloat(value);
  if (!isNaN(numberValue)) return numberValue;
  errors.addAt(`Expected "${value}" to be a numberValue.`, sectionNames, `* ${variableName}=`, '' + value);
  return numberValue;
}

export function describeAllowedValues(options:string[]):string {
  if (options.length === 0) return '';
  if (options.length === 1) return options[0];
  if (options.length === 2) return `"${options[0]}" or "${options[1]}"`;
  let concat = options[0];
  for(let i = 1; i < options.length; ++i) {
    concat += (i === options.length - 1) ? `, or ${options[i]}` : `, ${options[i]}`
  }
  return concat;
}