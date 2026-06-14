/// <reference types="node" />

/* Node-side level loading for the solve CLI. The app loads levels over HTTP (fetch + baseUrl),
  which doesn't exist here, so we read the markdown from disk and reuse the transport-agnostic
  import merger createLevelTextWithImportTexts() before handing off to the normal synchronous
  loadLevelFromText(). The pure text parsers are exported so they can be unit-tested without I/O. */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseNameValueLineEntries, parseOptions, parseSections } from '@/common/markdownUtil';
import { createLevelTextWithImportTexts } from '@/levelLoading/levelImportUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import Level from '@/game/types/Level';

const MANIFEST_FILENAME = 'levels.md';

export function findImportedFilenames(levelText:string):string[] {
  const generalSection = parseSections(levelText, 1, true).general || '';
  if (!generalSection) return [];
  const importEntry = parseNameValueLineEntries(generalSection, true).find(([name]) => name === 'imports') || null;
  return importEntry ? parseOptions(importEntry[1]) : [];
}

export function parseLevelManifestFilenames(manifestText:string):string[] {
  const levelsSection = parseSections(manifestText, 1, true).levels || '';
  return levelsSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('*'))
    .map(line => line.slice(1).trim())
    .filter(Boolean);
}

function _levelsDir():string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/levels');
}

async function _readLevelsFile(filename:string):Promise<string> {
  return readFile(path.join(_levelsDir(), filename), 'utf8');
}

export async function loadLevelManifestFilenames():Promise<string[]> {
  return parseLevelManifestFilenames(await _readLevelsFile(MANIFEST_FILENAME));
}

export async function loadLevelFromFile(filename:string):Promise<Level> {
  const levelText = await _readLevelsFile(filename);
  const importTexts = await Promise.all(findImportedFilenames(levelText).map(_readLevelsFile));
  const mergedText = createLevelTextWithImportTexts(importTexts, levelText);
  // Match the app's loadLevelFromUrl strictness so the CLI (solve / evaluate) rejects what the app
  // would reject — e.g. cloze answers missing from the conclusion categories (validateUnlockPhrases).
  return loadLevelFromText(mergedText, filename, { validateUnlockPhrases:true });
}
