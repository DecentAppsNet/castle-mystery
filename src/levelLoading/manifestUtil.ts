/* This file groups level-manifest loading, URL resolution, and selected-level persistence helpers.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

  import { assert } from "decent-portal";

import { baseUrl } from "@/common/urlUtil";
import { parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import LevelManifest from "./types/LevelManifest";
import { getLastLevelUrl } from "@/persistence/lastLevel";

async function _loadTextFromUrl(url:string):Promise<string> {
  return fetch(baseUrl(url)).then(async response => {
    if (!response.ok) throw new Error(`unable to load ${url}`);
    return await response.text();
  });
}

function _resolveManifestLevelUrl(manifestUrl:string, levelRef:string):string {
  if (levelRef.startsWith('/')) return levelRef;
  const lastSlashIndex = manifestUrl.lastIndexOf('/');
  return lastSlashIndex === -1
    ? levelRef
    : `${manifestUrl.slice(0, lastSlashIndex + 1)}${levelRef}`;
}

function _parseLevelUrls(manifestText:string, manifestUrl:string):string[] {
  const sections = parseSections(manifestText, 1, true);
  const levelsSection = sections.levels || '';
  return levelsSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('*'))
    .map(line => line.slice(1).trim())
    .filter(Boolean)
    .map(levelRef => _resolveManifestLevelUrl(manifestUrl, levelRef));
}

function _parseLevelTitle(levelText:string, levelUrl:string):string {
  const sections = parseSections(levelText, 1, true);
  const generalNameValues = parseUniqueNameValueLines(sections.general || '', 'general', true);
  const title = generalNameValues.title?.trim() || '';
  if (!title) throw new Error(`level '${levelUrl}' is missing general title`);
  return title;
}

function _levelUrlToI(levelUrls:string[], levelUrl:string):number {
  assert(levelUrls.length > 0);
  const i = levelUrls.indexOf(levelUrl);
  return i === -1 ? 0 : i;
}

/** Loads a manifest, its level titles, and the remembered selected level. */
export async function loadLevelManifestFromUrl(manifestUrl:string):Promise<LevelManifest> {
  const manifestText = await _loadTextFromUrl(manifestUrl);
  const levelUrls = _parseLevelUrls(manifestText, manifestUrl);
  if (!levelUrls.length) throw Error('No URLs for levels in levels.md.');
  const levelTitles = await Promise.all(levelUrls.map(async levelUrl => _parseLevelTitle(await _loadTextFromUrl(levelUrl), levelUrl)));
  const lastLevelUrl = await getLastLevelUrl() ?? '';
  const lastLevelI = _levelUrlToI(levelUrls, lastLevelUrl);
  return { levelUrls, levelTitles, lastLevelI };
}
