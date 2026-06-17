/* This module groups level-manifest loading, URL resolution, and selected-level persistence helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { baseUrl } from "@/common/urlUtil";
import { parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { endTiming, startTiming } from "@/common/timingPerformanceUtil";
import LevelManifest from "./types/LevelManifest";
import { getLastLevelUrl } from "@/persistence/lastLevel";
import { assert } from "decent-portal";

const GEN_INDEX_REF = '_gen-index.json';  // Dev-server endpoint listing the _gen.*.md candidates (see vite.config.ts).
const GEN_TITLE_PREFIX = '(GEN) ';        // Marker prepended to a candidate's title in the level selector.

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

export async function loadLevelManifestFromUrl(manifestUrl:string):Promise<LevelManifest> {
  const manifestTiming = `manifest parsing (${manifestUrl})`;
  startTiming(manifestTiming);
  try {
    const manifestText = await _loadTextFromUrl(manifestUrl);
    const levelUrls = _parseLevelUrls(manifestText, manifestUrl);
    if (!levelUrls.length) throw Error('No URLs for levels in levels.md.');
    const levelTitles = await Promise.all(levelUrls.map(async levelUrl => _parseLevelTitle(await _loadTextFromUrl(levelUrl), levelUrl)));
    const lastLevelUrl = await getLastLevelUrl() ?? '';
    const lastLevelI = _levelUrlToI(levelUrls, lastLevelUrl);
    return { levelUrls, levelTitles, lastLevelI };
  } finally {
    endTiming(manifestTiming);
  }
}

/* DEV-only: the Vite dev server (see vite.config.ts) serves the GEN_INDEX_REF endpoint listing the
  flat _gen.*.md candidate levels under public/levels/. Returns manifest entries for them, each title
  prefixed with GEN_TITLE_PREFIX. Returns empty when the endpoint is absent (production build) or a
  candidate is unreadable, so callers can append unconditionally. */
async function _loadGenLevelEntries(manifestUrl:string):Promise<{ levelUrls:string[], levelTitles:string[] }> {
  let filenames:string[] = [];
  try {
    const indexText = await _loadTextFromUrl(_resolveManifestLevelUrl(manifestUrl, GEN_INDEX_REF));
    const parsed:unknown = JSON.parse(indexText);
    if (Array.isArray(parsed)) filenames = parsed.filter((name):name is string => typeof name === 'string');
  } catch {
    return { levelUrls:[], levelTitles:[] }; // No dev endpoint (production) or unreadable index — no gen levels.
  }
  const levelUrls:string[] = [], levelTitles:string[] = [];
  for (const filename of filenames) {
    const levelUrl = _resolveManifestLevelUrl(manifestUrl, filename);
    try {
      const title = _parseLevelTitle(await _loadTextFromUrl(levelUrl), levelUrl);
      levelUrls.push(levelUrl);
      levelTitles.push(`${GEN_TITLE_PREFIX}${title}`);
    } catch { /* Skip an in-progress candidate that doesn't load yet, keeping the rest usable. */ }
  }
  return { levelUrls, levelTitles };
}

/* DEV-only: returns a copy of `manifest` with any public/levels/_gen.*.md candidate levels appended (titles
  prefixed "(GEN) "), recomputing the selected index so a last-selected candidate is restored. Returns
  `manifest` unchanged when there are no candidates. Callers should only invoke this when serving
  locally. */
export async function appendGenLevelsToManifest(manifest:LevelManifest, manifestUrl:string):Promise<LevelManifest> {
  const gen = await _loadGenLevelEntries(manifestUrl);
  if (!gen.levelUrls.length) return manifest;
  const levelUrls = [...manifest.levelUrls, ...gen.levelUrls];
  const levelTitles = [...manifest.levelTitles, ...gen.levelTitles];
  const lastLevelUrl = await getLastLevelUrl() ?? '';
  return { levelUrls, levelTitles, lastLevelI:_levelUrlToI(levelUrls, lastLevelUrl) };
}