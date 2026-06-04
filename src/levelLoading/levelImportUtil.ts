/* This module groups level-import loading and markdown section merging helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { parseOptions, parseSections } from "@/common/markdownUtil";
import { validateFilename } from "@/common/filenameValidationUtil";
import { normalizeId } from "@/game/idUtil";
import { parseNameValueLineEntries } from "@/common/markdownUtil";

type ImportedSection = {
  headingText:string,
  normalizedHeading:string,
  depth:number,
  bodyText:string,
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
    bodyText:'',
    children:[]
  };
}

function _parseSectionTree(markdownText:string):ImportedSection[] {
  const roots:ImportedSection[] = [];
  const stack:Array<{ depth:number, section:ImportedSection }> = [];

  markdownText.split('\n').forEach(line => {
    const heading = _findMarkdownHeadingLine(line);
    if (heading) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) stack.pop();
      const section = {
        ..._createSection(heading.headingText),
        depth:heading.depth
      };
      const parentSection = stack[stack.length - 1]?.section || null;
      if (parentSection) parentSection.children.push(section);
      else roots.push(section);
      stack.push({ depth:heading.depth, section });
      return;
    }

    const currentSection = stack[stack.length - 1]?.section || null;
    if (!currentSection) return;
    currentSection.bodyText += `${line}\n`;
  });

  return roots;
}

function _trimBodyText(text:string):string {
  return text.trim();
}

function _isBulletOnlyBody(text:string):boolean {
  const trimmedLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return trimmedLines.every(line => line.startsWith('*') && line.includes('='));
}

function _serializeBulletEntries(entries:Array<readonly [string, string]>):string {
  return entries.map(([name, value]) => `* ${name}=${value}`).join('\n');
}

function _mergeBulletOnlyBody(levelBodyText:string, importBodyText:string):string {
  const levelEntries = parseNameValueLineEntries(levelBodyText, false);
  const importEntries = parseNameValueLineEntries(importBodyText, false);
  if (!levelEntries.length) return _serializeBulletEntries(importEntries);
  if (!importEntries.length) return _serializeBulletEntries(levelEntries);

  const mergedEntries = new Map<string, { authoredName:string, value:string }>();
  const mergedEntryOrder:string[] = [];

  levelEntries.forEach(([name, value]) => {
    const normalizedName = normalizeId(name);
    if (!mergedEntries.has(normalizedName)) mergedEntryOrder.push(normalizedName);
    mergedEntries.set(normalizedName, { authoredName:name, value });
  });
  importEntries.forEach(([name, value]) => {
    const normalizedName = normalizeId(name);
    if (mergedEntries.has(normalizedName)) return;
    mergedEntryOrder.push(normalizedName);
    mergedEntries.set(normalizedName, { authoredName:name, value });
  });

  return _serializeBulletEntries(mergedEntryOrder.map(normalizedName => {
    const mergedEntry = mergedEntries.get(normalizedName);
    if (!mergedEntry) throw new Error(`missing merged entry for '${normalizedName}'`);
    return [mergedEntry.authoredName, mergedEntry.value] as const;
  }));
}

function _mergeSectionBody(levelBodyText:string, importBodyText:string):string {
  const trimmedLevelBodyText = _trimBodyText(levelBodyText);
  const trimmedImportBodyText = _trimBodyText(importBodyText);
  if (!trimmedLevelBodyText.length) return trimmedImportBodyText;
  if (!trimmedImportBodyText.length) return trimmedLevelBodyText;
  if (_isBulletOnlyBody(trimmedLevelBodyText) && _isBulletOnlyBody(trimmedImportBodyText)) {
    return _mergeBulletOnlyBody(trimmedLevelBodyText, trimmedImportBodyText);
  }
  return trimmedLevelBodyText;
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
    bodyText:_mergeSectionBody(mergedLevelSection.bodyText, importSection.bodyText),
    children:_mergeSectionTrees(mergedLevelSection.children, importSection.children)
  };
}

function _serializeSectionTree(sections:ImportedSection[]):string {
  return sections.map(section => _serializeSectionNode(section)).join('\n\n').trim();
}

function _serializeSectionNode(section:ImportedSection):string {
  const parts = [`${'#'.repeat(section.depth)} ${section.headingText}`];
  const bodyText = _trimBodyText(section.bodyText);
  if (bodyText.length > 0) parts.push(bodyText);
  const childText = _serializeSectionTree(section.children);
  if (childText.length > 0) parts.push(childText);
  return parts.join('\n\n');
}

function _mergeImportIntoLevelText(levelText:string, importText:string):string {
  const levelSections = _parseSectionTree(levelText);
  const importSections = _parseSectionTree(importText);
  if (!levelSections.length) return importText.trim();
  if (!importSections.length) return levelText.trim();
  return _serializeSectionTree(_mergeSectionTrees(levelSections, importSections));
}

export function createLevelTextWithImportTexts(importTexts:string[], levelText:string):string {
  let mergedText = levelText;
  for(let i = 0; i < importTexts.length; ++i) {
    mergedText = _mergeImportIntoLevelText(mergedText, importTexts[i]);
  }
  return mergedText;
}

export async function loadLevelTextWithImports(filename:string):Promise<string> {
  const levelUrl = _levelFilenameToUrl(filename);
  const sourceText = await _fetchTextFromUrl(levelUrl);
  const importFilenames = _findImportedFilenames(sourceText);
  if (!importFilenames.length) return sourceText;
  const importTexts = await Promise.all(importFilenames.map(importFilename => loadLevelTextWithImports(importFilename)));
  return createLevelTextWithImportTexts(importTexts, sourceText);
}