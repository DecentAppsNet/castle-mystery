/* This module groups public level-import loading APIs and high-level markdown import orchestration.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { parseOptions, parseSections } from "@/common/markdownUtil";
import { validateFilename } from "@/common/filenameValidationUtil";
import { parseNameValueLineEntries } from "@/common/markdownUtil";
import { createRawSourceMappedText } from "./importSerializationUtil";
import { mergeImportIntoLevelSource } from "./importSectionMergeUtil";
import SourceMappedText from "./types/SourceMappedText";

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
  if (!importFilenames.length) return createRawSourceMappedText(sourceText, filename);

    const importSources = await Promise.all(importFilenames.flatMap(importFilename => {
      _throwOnDirectSelfImport(filename, importFilename);
      if (loadingStack.includes(importFilename)) return [];
      return [_loadLevelTextWithSourceLineMap(importFilename, context, [...loadingStack, importFilename])];
    }));
  let mergedSource = createRawSourceMappedText(sourceText, filename);
  for (let i = 0; i < importSources.length; ++i) {
    mergedSource = mergeImportIntoLevelSource(mergedSource, importSources[i]);
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
  let mergedSource = createRawSourceMappedText(levelSource.text, levelSource.filename);
  for (let i = 0; i < importSources.length; ++i) {
    mergedSource = mergeImportIntoLevelSource(mergedSource, createRawSourceMappedText(importSources[i].text, importSources[i].filename));
  }
  return mergedSource;
}

export function createLevelTextWithImportTexts(importTexts:string[], levelText:string):string {
  return createLevelTextWithImportTextsAndSourceLineMap(
    importTexts.map((text, index) => ({ filename:`<import ${index + 1}>`, text })),
    { filename:'<level>', text:levelText }
  ).text;
}