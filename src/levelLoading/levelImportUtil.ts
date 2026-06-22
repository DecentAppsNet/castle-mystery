/* This module groups level-import loading and markdown section merging helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { parseOptions, parseSections } from "@/common/markdownUtil";
import { validateFilename } from "@/common/filenameValidationUtil";
import { normalizeId } from "@/game/idUtil";
import { parseNameValueLineEntries } from "@/common/markdownUtil";
import { lineBeginsWithTimestamp } from "./timestampUtil";

type SourceLine = {
  filename:string,
  lineNo:number
};

export type SourceLineMap = SourceLine[];

export type SourceMappedText = {
  text:string,
  sourceLineMap:SourceLineMap
};

type LoadImportsContext = {
  cache:Map<string, Promise<SourceMappedText>>
};

type ImportedLine = {
  text:string,
  sourceLine:SourceLine
};

type ImportedSection = {
  headingText:string,
  normalizedHeading:string,
  depth:number,
  headingSourceLine:SourceLine,
  bodyLines:ImportedLine[],
  children:ImportedSection[]
};

function _levelFilenameToUrl(filename:string):string {
  validateFilename(filename, 'general imports entries');
  return `/levels/${filename}`;
}

async function _fetchTextFromUrl(url:string):Promise<string> {
  const response = await fetch(baseUrl(url));
  const text = await response.text();
  return text;
}

function _findImportedFilenames(levelText:string):string[] {
  const sections = parseSections(levelText, 1, true);
  const generalSection = sections.general || '';
  if (!generalSection) return [];
  const importEntry = parseNameValueLineEntries(generalSection, true)
    .find(([name]) => name === 'imports') || null;
  if (!importEntry) return [];
  return parseOptions(importEntry[1]);
}

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

function _createSection(headingText:string):ImportedSection {
  return {
    headingText,
    normalizedHeading:normalizeId(headingText),
    depth:1,
    headingSourceLine:{ filename:'<unknown>', lineNo:1 },
    bodyLines:[],
    children:[]
  };
}

function _createSourceLine(filename:string, lineNo:number):SourceLine {
  return { filename, lineNo };
}

function _parseSectionTree(sourceMappedText:SourceMappedText):ImportedSection[] {
  const roots:ImportedSection[] = [];
  const stack:Array<{ depth:number, section:ImportedSection }> = [];

  const lines = sourceMappedText.text.split('\n');
  lines.forEach((line, index) => {
    const sourceLine = sourceMappedText.sourceLineMap[index] || _createSourceLine('<unknown>', index + 1);
    const heading = _findMarkdownHeadingLine(line);
    if (heading) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) stack.pop();
      const section = {
        ..._createSection(heading.headingText),
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

function _isBlankBodyLine(line:ImportedLine):boolean {
  return line.text.trim().length === 0;
}

function _trimBodyLines(lines:ImportedLine[]):ImportedLine[] {
  let startIndex = 0;
  let endIndex = lines.length;
  while (startIndex < endIndex && _isBlankBodyLine(lines[startIndex])) startIndex += 1;
  while (endIndex > startIndex && _isBlankBodyLine(lines[endIndex - 1])) endIndex -= 1;
  return lines.slice(startIndex, endIndex);
}

type BodyEntry = {
  authoredName:string,
  normalizedName:string,
  value:string,
  hasBulletPrefix:boolean,
  line:ImportedLine,
  sourceLine:SourceLine
};

type BodyToken =
  | { type:'comment', lines:ImportedLine[] }
  | { type:'nameValue', entry:BodyEntry }
  | { type:'timestamp', line:ImportedLine }
  | { type:'fencedCode', lines:ImportedLine[] };

function _parseBodyEntry(line:ImportedLine):BodyEntry|null {
  const trimmedLine = line.text.trim();
  const hasBulletPrefix = trimmedLine.startsWith('*');
  const contentText = hasBulletPrefix ? trimmedLine.slice(1).trim() : trimmedLine;
  const equalsIndex = contentText.indexOf('=');
  if (equalsIndex === -1) return null;
  const authoredName = contentText.slice(0, equalsIndex).trim();
  if (!authoredName.length) return null;
  return {
    authoredName,
    normalizedName:normalizeId(authoredName),
    value:contentText.slice(equalsIndex + 1).trim(),
    hasBulletPrefix,
    line,
    sourceLine:line.sourceLine
  };
}

function _findFencedCodeBlockEndIndex(lines:ImportedLine[], startIndex:number):number|null {
  if (!lines[startIndex]?.text.trim().startsWith('```')) return null;
  for (let i = startIndex + 1; i < lines.length; ++i) {
    if (lines[i].text.trim().startsWith('```')) return i;
  }
  return lines.length - 1;
}

function _parseBodyTokens(lines:ImportedLine[]):BodyToken[] {
  const trimmedLines = _trimBodyLines(lines);
  const tokens:BodyToken[] = [];
  for (let i = 0; i < trimmedLines.length; ++i) {
    const line = trimmedLines[i];
    const fencedCodeEndIndex = _findFencedCodeBlockEndIndex(trimmedLines, i);
    if (fencedCodeEndIndex !== null) {
      tokens.push({ type:'fencedCode', lines:trimmedLines.slice(i, fencedCodeEndIndex + 1) });
      i = fencedCodeEndIndex;
      continue;
    }

    const bodyEntry = _parseBodyEntry(line);
    if (bodyEntry) {
      tokens.push({ type:'nameValue', entry:bodyEntry });
      continue;
    }

    if (lineBeginsWithTimestamp(line.text)) {
      tokens.push({ type:'timestamp', line });
      continue;
    }

    tokens.push({ type:'comment', lines:[line] });
  }
  return tokens;
}

function _serializeBodyEntry(entry:BodyEntry):ImportedLine {
  return {
    text:entry.hasBulletPrefix
      ? `* ${entry.authoredName}=${entry.value}`
      : `${entry.authoredName}=${entry.value}`,
    sourceLine:entry.sourceLine
  };
}

function _flattenBodyTokens(tokens:BodyToken[]):ImportedLine[] {
  return tokens.flatMap(token => {
    switch(token.type) {
      case 'comment': return token.lines;
      case 'nameValue': return [_serializeBodyEntry(token.entry)];
      case 'timestamp': return [token.line];
      case 'fencedCode': return token.lines;
    }
  });
}

function _mergeStructuredBody(levelBodyLines:ImportedLine[], importBodyLines:ImportedLine[]):ImportedLine[] {
  const levelTokens = _parseBodyTokens(levelBodyLines);
  const importTokens = _parseBodyTokens(importBodyLines);
  const levelNameValueIds = new Set(levelTokens.flatMap(token => token.type === 'nameValue' ? [token.entry.normalizedName] : []));
  const hasLevelFencedCode = levelTokens.some(token => token.type === 'fencedCode');
  const mergedTokens = [...levelTokens];
  let hasMergedFencedCode = hasLevelFencedCode;

  importTokens.forEach(token => {
    switch(token.type) {
      case 'comment':
        return;
      case 'nameValue':
        if (levelNameValueIds.has(token.entry.normalizedName)) return;
        mergedTokens.push(token);
        levelNameValueIds.add(token.entry.normalizedName);
        return;
      case 'timestamp':
        mergedTokens.push(token);
        return;
      case 'fencedCode':
        if (hasMergedFencedCode) return;
        mergedTokens.push(token);
        hasMergedFencedCode = true;
        return;
    }
  });

  return _flattenBodyTokens(mergedTokens);
}

function _mergeSectionBody(levelBodyLines:ImportedLine[], importBodyLines:ImportedLine[]):ImportedLine[] {
  const trimmedLevelBodyLines = _trimBodyLines(levelBodyLines);
  const trimmedImportBodyLines = _trimBodyLines(importBodyLines);
  if (!trimmedLevelBodyLines.length) return trimmedImportBodyLines;
  if (!trimmedImportBodyLines.length) return trimmedLevelBodyLines;
  return _mergeStructuredBody(trimmedLevelBodyLines, trimmedImportBodyLines);
}

function _mergeSectionTrees(levelSections:ImportedSection[], importSections:ImportedSection[]):ImportedSection[] {
  const levelSectionsByName = new Map(levelSections.map(section => [section.normalizedHeading, section]));
  const mergedSections:ImportedSection[] = [];

  levelSections.forEach(levelSection => {
    const importSection = importSections.find(candidate => candidate.normalizedHeading === levelSection.normalizedHeading) || null;
    mergedSections.push(importSection ? _mergeSectionNodes(levelSection, importSection) : levelSection);
  });
  importSections.forEach(importSection => {
    if (levelSectionsByName.has(importSection.normalizedHeading)) return;
    mergedSections.push(importSection);
  });

  return mergedSections;
}

function _mergeSectionNodes(levelSection:ImportedSection|null, importSection:ImportedSection):ImportedSection {
  const mergedLevelSection = levelSection || _createSection(importSection.headingText);
  return {
    headingText:mergedLevelSection.headingText,
    normalizedHeading:mergedLevelSection.normalizedHeading,
    depth:mergedLevelSection.depth,
    headingSourceLine:mergedLevelSection.headingSourceLine.filename === '<unknown>'
      ? importSection.headingSourceLine
      : mergedLevelSection.headingSourceLine,
    bodyLines:_mergeSectionBody(mergedLevelSection.bodyLines, importSection.bodyLines),
    children:_mergeSectionTrees(mergedLevelSection.children, importSection.children)
  };
}

function _createSourceMappedText(text:string, sourceLineMap:SourceLineMap):SourceMappedText {
  return { text, sourceLineMap };
}

function _createRawSourceMappedText(text:string, filename:string):SourceMappedText {
  return _createSourceMappedText(text, text.split('\n').map((_, index) => _createSourceLine(filename, index + 1)));
}

function _createBlankLine(sourceLine:SourceLine):ImportedLine {
  return { text:'', sourceLine };
}

function _serializeSectionNode(section:ImportedSection):ImportedLine[] {
  const lines:ImportedLine[] = [{
    text:`${'#'.repeat(section.depth)} ${section.headingText}`,
    sourceLine:section.headingSourceLine
  }];
  const bodyLines = _trimBodyLines(section.bodyLines);
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

function _serializeSourceMappedSections(sections:ImportedSection[]):SourceMappedText {
  const lines = _serializeSectionTree(sections);
  return _createSourceMappedText(lines.map(line => line.text).join('\n'), lines.map(line => line.sourceLine));
}

function _mergeImportIntoLevelSource(levelSource:SourceMappedText, importSource:SourceMappedText):SourceMappedText {
  const levelSections = _parseSectionTree(levelSource);
  const importSections = _parseSectionTree(importSource);
  if (!levelSections.length) return {
    text:importSource.text.trim(),
    sourceLineMap:importSource.sourceLineMap.slice(0, importSource.text.trim().split('\n').length)
  };
  if (!importSections.length) return {
    text:levelSource.text.trim(),
    sourceLineMap:levelSource.sourceLineMap.slice(0, levelSource.text.trim().split('\n').length)
  };
  return _serializeSourceMappedSections(_mergeSectionTrees(levelSections, importSections));
}

export function createLevelTextWithImportTextsAndSourceLineMap(importSources:Array<{ filename:string, text:string }>,
  levelSource:{ filename:string, text:string }):SourceMappedText {
  let mergedSource = _createRawSourceMappedText(levelSource.text, levelSource.filename);
  for (let i = 0; i < importSources.length; ++i) {
    mergedSource = _mergeImportIntoLevelSource(mergedSource, _createRawSourceMappedText(importSources[i].text, importSources[i].filename));
  }
  return mergedSource;
}

export function createLevelTextWithImportTexts(importTexts:string[], levelText:string):string {
  return createLevelTextWithImportTextsAndSourceLineMap(
    importTexts.map((text, index) => ({ filename:`<import ${index + 1}>`, text })),
    { filename:'<level>', text:levelText }
  ).text;
}

function _throwOnDirectSelfImport(filename:string, importFilename:string):void {
  if (importFilename !== filename) return;
  throw new Error(`A level file can't import itself.`);
}

async function _loadLevelTextWithSourceLineMap(filename:string, context:LoadImportsContext,
  loadingStack:readonly string[]):Promise<SourceMappedText> {
  const cachedSource = context.cache.get(filename) || null;
  if (cachedSource) return cachedSource;

  const sourcePromise = (async () => {
  const levelUrl = _levelFilenameToUrl(filename);
  const sourceText = await _fetchTextFromUrl(levelUrl);
  const importFilenames = _findImportedFilenames(sourceText);
  if (!importFilenames.length) return _createRawSourceMappedText(sourceText, filename);

    const importSources = await Promise.all(importFilenames.flatMap(importFilename => {
      _throwOnDirectSelfImport(filename, importFilename);
      if (loadingStack.includes(importFilename)) return [];
      return [_loadLevelTextWithSourceLineMap(importFilename, context, [...loadingStack, importFilename])];
    }));
  let mergedSource = _createRawSourceMappedText(sourceText, filename);
  for (let i = 0; i < importSources.length; ++i) {
    mergedSource = _mergeImportIntoLevelSource(mergedSource, importSources[i]);
  }
  return mergedSource;
  })();

  context.cache.set(filename, sourcePromise);
  try {
    return await sourcePromise;
  } catch (error) {
    context.cache.delete(filename);
    throw error;
  }
}

export async function loadLevelTextWithSourceLineMap(filename:string):Promise<SourceMappedText> {
  return _loadLevelTextWithSourceLineMap(filename, { cache:new Map() }, [filename]);
}

export async function loadLevelTextWithImports(filename:string):Promise<string> {
  return (await loadLevelTextWithSourceLineMap(filename)).text;
}