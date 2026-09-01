/* This file groups source fetching and recursive import-loading helpers for level importing.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { parseOptions, parseSections } from "@/common/markdownUtil";
import { validateFilename } from "@/common/filenameValidationUtil";
import { baseUrl } from "@/common/urlUtil";
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

/** Loads a level with recursive imports merged while preserving original source locations. */
export async function loadLevelWithImportsAndSourceLineMap(filename:string):Promise<SourceMappedText> {
  return _loadLevelTextWithSourceLineMap(filename, { cache:new Map() }, [filename]);
}