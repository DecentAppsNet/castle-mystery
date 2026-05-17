/*
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

*/

// Type for associative array
type Sections = { [sectionName:string]:string };
export type NameValues = { [name:string]:string };

// E.g., "hello world" -> "helloWorld".
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

function _findHeadingText(line:string, indentLevel:number):string|null {
  const trimmedLeftLine = line.trimStart();
  const prefix = '#'.repeat(indentLevel);
  if (!trimmedLeftLine.startsWith(prefix)) return null;
  if (trimmedLeftLine.length === prefix.length) return null;
  const nextChar = trimmedLeftLine[prefix.length];
  if (nextChar !== ' ' && nextChar !== '\t') return null;
  return trimmedLeftLine.slice(prefix.length).trim();
}

function _findBulletedLineText(line:string):string|null {
  const trimmedLeftLine = line.trimStart();
  if (!trimmedLeftLine.startsWith('*')) return null;
  return trimmedLeftLine.slice(1).trim();
}

// Parse the heading sections of a markdown text. The header of each section is the section name, and the content of each section is the value for the section.
function _parseSectionArrays(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):{sectionNames:string[], sectionContents:string[]} {
  const _addSection = (_sectionName:string, _sectionContent:string) => {
    if (sectionNames.includes(_sectionName)) throw new Error(`duplicate section '${_sectionName}'`);
    sectionNames.push(_sectionName);
    sectionContents.push(_sectionContent.trim());
  };

  const lines = markdownText.split('\n').filter(line => line.trim().length > 0);
  const sectionNames:string[] = [], sectionContents:string[] = [];

  let sectionName = '';
  let sectionContent = '';
  for (const line of lines) {
    const headingText = _findHeadingText(line, indentLevel);
    if (headingText !== null) {
      if (sectionName) _addSection(sectionName, sectionContent); // Store previous section before beginning a new one.
      sectionName = useCamelCase ? normalizeMarkdownName(headingText) : headingText;
      sectionContent = '';
    } else {
      sectionContent += line + '\n';
    }
  }
  if (sectionName) _addSection(sectionName, sectionContent); // Store the last section.

  return {sectionNames, sectionContents};
}

// Parse the heading sections of a markdown text. The header of each section is the sectionName key, and the content of each section is the value.
export function parseSections(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):Sections {
  const sections:Sections = {};
  const {sectionNames, sectionContents} = _parseSectionArrays(markdownText, indentLevel, useCamelCase);
  for (let i = 0; i < sectionNames.length; ++i) {
    sections[sectionNames[i]] = sectionContents[i];
  }
  return sections;
}

export function parseSectionEntries(markdownText:string, indentLevel:number = 1, useCamelCase:boolean = false):Array<readonly [string, string]> {
  const {sectionNames, sectionContents} = _parseSectionArrays(markdownText, indentLevel, useCamelCase);
  return sectionNames.map((sectionName, index) => [sectionName, sectionContents[index]] as const);
}

// Parse the lines of a markdown text. Remove any extra whitespace or bullet points.
function _parseLines(markdownText:string):string[] {
  const lines = markdownText.split('\n');
  return lines
    .map(line => line.trim())
    .filter(line => line && line.length > 0);
}

// Parse the value portion of markdown text and replace any supported escaping, e.g. "\n".
function _unescapeValue(text:string):string {
  return text.split('\\n').join('\n');
}

function _parseNameValueEntries(markdownText:string, useCamelCase:boolean = false):Array<readonly [string, string]> {
  const entries:Array<readonly [string, string]> = [];
  const lines = _parseLines(markdownText);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const bulletText = _findBulletedLineText(line);
    if (bulletText === null) continue;
    const hyphenPos = bulletText.indexOf('=');
    if (hyphenPos === -1) continue;
    const name = bulletText.slice(0, hyphenPos).trim();
    if (!name.length) continue;
    const value = _unescapeValue(bulletText.slice(hyphenPos + 1).trim());
    entries.push([useCamelCase ? normalizeMarkdownName(name) : name, value] as const);
  }
  return entries;
}

export function parseUniqueNameValueLines(markdownText:string, contextLabel:string, useCamelCase:boolean = false):NameValues {
  const nameValues:NameValues = {};
  _parseNameValueEntries(markdownText, useCamelCase).forEach(([name, value]) => {
    if (Object.hasOwn(nameValues, name)) throw new Error(`duplicate ${contextLabel} entry '${name}'`);
    nameValues[name] = value;
  });
  return nameValues;
}

export function parseNameValueLineEntries(markdownText:string, useCamelCase:boolean = false):Array<readonly [string, string]> {
  return _parseNameValueEntries(markdownText, useCamelCase);
}

export function parseOptions(optionText:string):string[] {
  return optionText.split('|').map(t => t.trim()).filter(t => t.length > 0);
}

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