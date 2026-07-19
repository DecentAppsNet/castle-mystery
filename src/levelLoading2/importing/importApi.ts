/* This module groups public level-import loading APIs and high-level markdown import orchestration.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { parseOptions, parseSections } from "@/common/markdownUtil";
import { validateFilename } from "@/common/filenameValidationUtil";
import { parseNameValueLineEntries } from "@/common/markdownUtil";
import { mergeSectionBody, trimBodyLines } from "./importBodyTokenUtil";
import { createSection, createSourceLine, parseSectionTree } from "./importSectionTreeUtil";
import ImportedLine from "./types/ImportedLine";
import ImportedSection from "./types/ImportedSection";
import SourceMappedText from "./types/SourceMappedText";
import SourceLine from "./types/SourceLine";
import SourceLineMap from "./types/SourceLineMap";

type LoadImportsContext = {
  cache:Map<string, Promise<SourceMappedText>>
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
  const mergedLevelSection = levelSection || createSection(importSection.headingText);
  return {
    headingText:mergedLevelSection.headingText,
    normalizedHeading:mergedLevelSection.normalizedHeading,
    depth:mergedLevelSection.depth,
    headingSourceLine:mergedLevelSection.headingSourceLine.filename === '<unknown>'
      ? importSection.headingSourceLine
      : mergedLevelSection.headingSourceLine,
    bodyLines:mergeSectionBody(mergedLevelSection.bodyLines, importSection.bodyLines),
    children:_mergeSectionTrees(mergedLevelSection.children, importSection.children)
  };
}

function _createSourceMappedText(text:string, sourceLineMap:SourceLineMap):SourceMappedText {
  return { text, sourceLineMap };
}

function _createRawSourceMappedText(text:string, filename:string):SourceMappedText {
  return _createSourceMappedText(text, text.split('\n').map((_, index) => createSourceLine(filename, index + 1)));
}

function _createBlankLine(sourceLine:SourceLine):ImportedLine {
  return { text:'', sourceLine };
}

function _serializeSectionNode(section:ImportedSection):ImportedLine[] {
  const lines:ImportedLine[] = [{
    text:`${'#'.repeat(section.depth)} ${section.headingText}`,
    sourceLine:section.headingSourceLine
  }];
  const bodyLines = trimBodyLines(section.bodyLines);
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
  const levelSections = parseSectionTree(levelSource);
  const importSections = parseSectionTree(importSource);
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