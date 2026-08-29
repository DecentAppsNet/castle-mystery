/*
This module groups shared markdown-parsing helpers for section, line, and name/value conventions used as configuration formats.

There's some parsing conventions that seem to work well across multiple formats based on markdown. Think of the format layering like:

  markdown format                                                        (base)
    common conventions for retrieving settings-like data inside markdown (middle)
      a specific format for one thing                                    (top)

This module is for that *middle* layer of format specification. I like using markdown as a base format because I get some nice 
syntax coloring in IDEs and on Github. And unlike other formats more specifically designed for storing settings, (e.g., yaml) I don't get
an extra dependency library in the project. Markdown may not have been intended to be a format for settings/configuration - I 
just think it's easy and nice to extend it.

Some conventions this module supports/promotes:
* Use of Markdown headings to hierarchically arrange sections.
* Name/value pairs retrieved from bulleted lines.

If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes.
*/

// Type for associative array
export type Sections = { [sectionName:string]:string };
type NameValues = { [name:string]:string };
export type SectionEntryWithLine = { name:string, value:string, lineNo:number, bodyStartLineI:number };
type NameValueEntryWithLine = { name:string, value:string, lineNo:number };

export class MarkdownLineError extends Error {
  readonly lineNo:number;

  // Store the markdown line number that triggered this parsing error.
  constructor(lineNo:number, message:string) {
    super(message);
    this.name = 'MarkdownLineError';
    this.lineNo = lineNo;
  }
}

// Convert a markdown-style label into a normalized camelCase key.
export function normalizeMarkdownName(text:string):string {
  const words = text.trim().split(' ').filter(word => word.trim() !== '');
  if (words.length === 0) return '';
  if (words.length === 1) {
    const word = words[0];
    const hasLowercaseAfterFirstChar = Array.from(word.slice(1)).some(char => char >= 'a' && char <= 'z');
    if (hasLowercaseAfterFirstChar) return word[0].toLowerCase() + word.slice(1);
    return word.toLowerCase();
  }
  return words
    .map(word => word.toLowerCase())
    .map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
}

// Return the heading text for a line when it matches the requested heading depth.
function _findHeadingText(line:string, indentLevel:number):string|null {
  const trimmedLeftLine = line.trimStart();
  const prefix = '#'.repeat(indentLevel);
  if (!trimmedLeftLine.startsWith(prefix)) return null;
  if (trimmedLeftLine.length === prefix.length) return null;
  const nextChar = trimmedLeftLine[prefix.length];
  if (nextChar !== ' ' && nextChar !== '\t') return null;
  return trimmedLeftLine.slice(prefix.length).trim();
}

function _isHeadingLine(line:string):boolean {
  line = line.trim();
  let endPos = line.indexOf(' ');
  if (endPos === -1) endPos = line.length;
  let foundPound = false;
  for(let i = 0; i < endPos; ++i) {
    if (line[i] !== '#') return false;
    foundPound = true;
  }
  return foundPound;
}

// Return the content of a bulleted line without the leading bullet marker.
function _findBulletedLineText(line:string):string|null {
  const trimmedLeftLine = line.trimStart();
  if (!trimmedLeftLine.startsWith('*')) return null;
  return trimmedLeftLine.slice(1).trim();
}

// Remove the trailing newline added while accumulating section content.
function _trimStoredSectionContent(sectionContent:string):string {
  return sectionContent.endsWith('\n') ? sectionContent.slice(0, -1) : sectionContent;
}

// Parse heading sections and keep each section's starting line number.
function _parseSectionEntriesWithLines(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false,
  firstLineNo:number = 1):SectionEntryWithLine[] {
  const lines = markdownText.split('\n');
  const sectionEntries:SectionEntryWithLine[] = [];

  let sectionName = '';
  let sectionContent = '';
  let sectionLineNo = firstLineNo;
  for (let index = 0; index < lines.length; ++index) {
    const line = lines[index];
    const headingText = _findHeadingText(line, indentLevel);
    if (headingText !== null) {
      if (sectionName) {
        sectionEntries.push({
          name:sectionName,
          value:_trimStoredSectionContent(sectionContent),
          lineNo:sectionLineNo,
          bodyStartLineI:sectionLineNo
        });
      }
      sectionName = useCamelCase ? normalizeMarkdownName(headingText) : headingText;
      sectionLineNo = firstLineNo + index;
      sectionContent = '';
    } else {
      sectionContent += line + '\n';
    }
  }
  if (sectionName) {
    sectionEntries.push({
      name:sectionName,
      value:_trimStoredSectionContent(sectionContent),
      lineNo:sectionLineNo,
      bodyStartLineI:sectionLineNo
    });
  }

  const seenSectionNames = new Set<string>();
  sectionEntries.forEach(sectionEntry => {
    if (seenSectionNames.has(sectionEntry.name)) throw new MarkdownLineError(sectionEntry.lineNo, `duplicate section '${sectionEntry.name}'`);
    seenSectionNames.add(sectionEntry.name);
  });

  return sectionEntries;
}

// Parse heading sections into parallel arrays of section names and contents.
function _parseSectionArrays(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):{sectionNames:string[], sectionContents:string[]} {
  const sectionEntries = _parseSectionEntriesWithLines(markdownText, indentLevel, useCamelCase);
  return {
    sectionNames:sectionEntries.map(sectionEntry => sectionEntry.name),
    sectionContents:sectionEntries.map(sectionEntry => sectionEntry.value)
  };
}

// Normalize the requested section ids into the same naming form as parsed sections.
function _normalizeIncludedSectionIds(includedSectionIds:ReadonlyArray<string>, useCamelCase:boolean):Set<string> {
  return new Set(includedSectionIds.map(sectionId => useCamelCase ? normalizeMarkdownName(sectionId) : sectionId));
}

// Build a section lookup object, optionally filtering to a specific set of section ids.
function _createSectionsObject(sectionNames:string[], sectionContents:string[], includedSectionIds:Set<string>|null = null):Sections {
  const sections:Sections = {};
  for (let i = 0; i < sectionNames.length; ++i) {
    const sectionName = sectionNames[i];
    if (includedSectionIds && !includedSectionIds.has(sectionName)) continue;
    sections[sectionName] = sectionContents[i];
  }
  return sections;
}

// Parse markdown headings into a section-name-to-content map.
export function parseSections(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):Sections {
  const {sectionNames, sectionContents} = _parseSectionArrays(markdownText, indentLevel, useCamelCase);
  return _createSectionsObject(sectionNames, sectionContents);
}

// Parse only the requested heading sections into a section-name-to-content map.
export function parseIncludedSections(markdownText:string, includedSectionIds:ReadonlyArray<string>, indentLevel:number = 1,
  useCamelCase:boolean = false):Sections {
  const {sectionNames, sectionContents} = _parseSectionArrays(markdownText, indentLevel, useCamelCase);
  const normalizedIncludedSectionIds = _normalizeIncludedSectionIds(includedSectionIds, useCamelCase);
  return _createSectionsObject(sectionNames, sectionContents, normalizedIncludedSectionIds);
}

// Parse heading sections into ordered name/content entry tuples.
export function parseSectionEntries(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):Array<readonly [string, string]> {
  const {sectionNames, sectionContents} = _parseSectionArrays(markdownText, indentLevel, useCamelCase);
  return sectionNames.map((sectionName, index) => [sectionName, sectionContents[index]] as const);
}

// Parse heading sections into entries that include each section's starting line number.
export function parseSectionEntriesWithLines(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false,
  firstLineNo:number = 1):SectionEntryWithLine[] {
  return _parseSectionEntriesWithLines(markdownText, indentLevel, useCamelCase, firstLineNo);
}

// Split markdown into trimmed lines for line-oriented parsing helpers.
function _parseLines(markdownText:string):string[] {
  return markdownText.split('\n').map(line => line.trim());
}

// Replace supported escape sequences in parsed markdown values.
function _unescapeValue(text:string):string {
  return text.split('\\n').join('\n');
}

// Parse bulleted name/value lines and keep the source line for each entry.
function _parseNameValueEntriesWithLines(markdownText:string, useCamelCase:boolean = false,
  firstLineNo:number = 1):NameValueEntryWithLine[] {
  const entries:NameValueEntryWithLine[] = [];
  const lines = _parseLines(markdownText);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (_isHeadingLine(line)) return entries; // Only want to include name/values for this section.
    const bulletText = _findBulletedLineText(line);
    if (bulletText === null) continue;
    const hyphenPos = bulletText.indexOf('=');
    if (hyphenPos === -1) continue;
    const name = bulletText.slice(0, hyphenPos).trim();
    if (!name.length) continue;
    const value = _unescapeValue(bulletText.slice(hyphenPos + 1).trim());
    entries.push({ name:useCamelCase ? normalizeMarkdownName(name) : name, value, lineNo:firstLineNo + i });
  }
  return entries;
}

// Parse bulleted name/value lines into ordered name/value entry tuples.
function _parseNameValueEntries(markdownText:string, useCamelCase:boolean = false):Array<readonly [string, string]> {
  return _parseNameValueEntriesWithLines(markdownText, useCamelCase).map(({ name, value }) => [name, value] as const);
}

// Parse unique bulleted name/value lines into a lookup object.
export function parseUniqueNameValueLines(markdownText:string, contextLabel:string, useCamelCase:boolean = false,
  firstLineNo:number = 1):NameValues {
  const nameValues:NameValues = {};
  _parseNameValueEntriesWithLines(markdownText, useCamelCase, firstLineNo).forEach(({ name, value, lineNo }) => {
    if (Object.hasOwn(nameValues, name)) throw new MarkdownLineError(lineNo, `duplicate ${contextLabel} entry '${name}'`);
    nameValues[name] = value;
  });
  return nameValues;
}

// Find the line number of a parsed bulleted name/value property within a section.
export function findNameValueLineNo(sectionText:string, propertyName:string):number {
  const matchingEntry = _parseNameValueEntriesWithLines(sectionText).find(entry => {
    return entry.name === propertyName || normalizeMarkdownName(entry.name) === propertyName;
  }) || null;
  return matchingEntry === null ? -1 : matchingEntry.lineNo;
}

// Parse bulleted name/value lines into ordered name/value entry tuples.
export function parseNameValueLineEntries(markdownText:string, useCamelCase:boolean = false):Array<readonly [string, string]> {
  return _parseNameValueEntries(markdownText, useCamelCase);
}

// Split a pipe-delimited option list into trimmed non-empty values.
export function parseOptions(optionText:string):string[] {
  return optionText.split('|').map(t => t.trim()).filter(t => t.length > 0);
}

// Return the non-empty lines from the first fenced code block in the markdown text.
export function parseFirstFencedCodeBlockLines(markdownText:string):string[] {
  const lines = markdownText.split('\n');
  const fenceStartIndex = lines.findIndex(line => line.trim().startsWith('```'));
  if (fenceStartIndex === -1) return [];

  const blockLines:string[] = [];
  for (let i = fenceStartIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith('```')) break;
    if (trimmedLine.length > 0) blockLines.push(trimmedLine);
  }
  return blockLines;
}