/* This module groups public level-import APIs for levelLoading2 importing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { createRawSourceMappedText } from "./importSerializationUtil";
import { mergeImportIntoLevelSource } from "./importSectionMergeUtil";
import { loadLevelTextWithSourceLineMap } from "./importSourceLoader.ts";
import SourceMappedText from "./types/SourceMappedText";

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