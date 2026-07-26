import { MarkdownLineError, parseNameValueLineEntries, parseSectionEntriesWithLines, parseSections, SectionEntryWithLine, Sections } from "@/common/markdownUtil";
import LevelFileSection from "./types/LevelFileSection";
import ErrorCollector from "./errorCollection/ErrorCollector";
import LevelFileSections from "./types/LevelFileSections";
import { normalizeId } from "@/game/idUtil";
import SectionEntryMap from "./types/SectionEntryMap";
import { ROOT_LEVEL } from "./errorCollection/sourceLocationUtil";
import SectionVariables from "./types/SectionVariables";

const KNOWN_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'room styles', 'rooms', 'characters', 'items', 'itinerary', 'conclusions'];
const REQUIRED_TOP_LEVEL_SECTION_IDS = ['general', 'map', 'rooms', 'characters'];
const TRIM_LEADING_BLANK_LINES_SECTION_IDS = ['itinerary'];

function _areKnownTopLevelSections(text:string, errors:ErrorCollector):boolean {
  const orginalErrorCount = errors.count;
  const sectionEntries:SectionEntryWithLine[] = parseSectionEntriesWithLines(text, 1, false);
  for(let i = 0; i < sectionEntries.length; ++i) {
    const sectionEntry = sectionEntries[i];
    const sectionId = normalizeId(sectionEntry.name);
    if (KNOWN_TOP_LEVEL_SECTION_IDS.includes(sectionId)) continue;
    const sectionName = sectionEntry.name;
    errors.addAt(`"${sectionName}" is not a known top-level section name.`, ROOT_LEVEL, `# ${sectionName}`);
  }
  return errors.count <= orginalErrorCount;
}

function _trimLeadingBlankLines(text:string):string {
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  return lines.join('\n');
}

function _isDuplicateError(err:any, errors:ErrorCollector, sectionNames:string[]|string):boolean {
  if (err?.name === 'MarkdownLineError') {
    const markdownLineError:MarkdownLineError = err;
    if (markdownLineError.message.includes('duplicate')) {
      errors.addAt(markdownLineError.message, sectionNames);
      return true;
    }
  }
  return false;
}

function _getTopLevelSections(levelText:string, errors:ErrorCollector):Sections|null {
  if (!_areKnownTopLevelSections(levelText, errors)) return null;
  try {
    const parsedSections = parseSections(levelText, 1, false);
    const sectionNames = Object.keys(parsedSections);
    sectionNames.forEach(sectionName => {
      const sectionId = normalizeId(sectionName);
      if (sectionId === sectionName) return;
      parsedSections[sectionId] = parsedSections[sectionName];
      delete parsedSections[sectionName];
    });
    return parsedSections;
  } catch(err) {
    if (_isDuplicateError(err, errors, ROOT_LEVEL)) return null;
    throw err;
  }
}

export function loadLevelSections(levelText:string, errors:ErrorCollector):LevelFileSections|null {
  const originalErrorCount = errors.count;
  
  const sections:Record<string, LevelFileSection> = {};
  const parsedSections = _getTopLevelSections(levelText, errors);
  if (!parsedSections) return null;
  
  KNOWN_TOP_LEVEL_SECTION_IDS.forEach(sectionId => {
    const sectionText = parsedSections[sectionId];
    if (!sectionText) return;
    const text = TRIM_LEADING_BLANK_LINES_SECTION_IDS.includes(sectionId) ? _trimLeadingBlankLines(sectionText) : sectionText;
    const section:LevelFileSection = { id:sectionId, text }
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
    if (_isDuplicateError(err, errors, sectionId)) return [];
    throw err;
  }
}

export function createSectionVariables(sectionText:string, sectionsNames:string[]|string, errors:ErrorCollector):SectionVariables {
  const variables:SectionVariables = {};
  const entries:Array<readonly [string, string]> = parseNameValueLineEntries(sectionText);
  for(let i = 0; i < entries.length; ++i) {
    const [authoredName, value] = entries[i];
    const id = normalizeId(authoredName);
    if (variables[id] !== undefined) errors.addAt(`"${authoredName}" variable appears more than once in section.`, sectionsNames, `* ${authoredName}=`);
    variables[id] = { id, authoredName, value };
  }
  return variables;
}

export function createNormalizedSectionEntryMap(sectionText:string, indentLevel:number, sectionNames:string[]|string, 
    errors:ErrorCollector):SectionEntryMap {
  const normalizedEntries = new Map<string, SectionEntryWithLine>();

  // First, get the section entries. It's possible that the non-normalized entries will throw a duplicate section
  // exception which is an expected condition to handle.
  let sectionEntries;
  try {
    sectionEntries = parseSectionEntriesWithLines(sectionText, indentLevel, false);
    if (!sectionEntries.length) return normalizedEntries; // No sub-sections.
  } catch (err:any) {
    if (_isDuplicateError(err, errors, sectionNames)) return normalizedEntries;
    throw err;
  }

  // Add in the entries, normalizing ID and checking for post-normalization dupes.
  sectionEntries.forEach(sectionEntry => {
    const normalizedName = normalizeId(sectionEntry.name);
    const existingEntry = normalizedEntries.get(normalizedName) || null;
    if (existingEntry) {
      errors.addAt(`After normalization, 
        "${sectionEntry.name}" has same name as another. Make sure all section anmes are case-insensitive unique.`, 
        sectionNames);
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