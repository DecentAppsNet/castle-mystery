/* This module groups top-level level-loading orchestration, composing section-specific loaders into a validated Level model. */

import Level from "../types/Level";
import TimeLabel from "../types/TimeLabel";
import { duplicateCharacter } from "../types/Character";
import { baseUrl } from "@/common/urlUtil";
import { MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { normalizeMarkdownName, parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { parseTimestampToMsecs } from "@/common/timestampUtil";
import { loadItineraries } from "./levelItineraryLoader";
import LoadLevelException from "./LoadLevelException";
import {
  addRoomExitsFromRoomsSection,
  addRoomPositionMarkersFromSections,
  applyRoomMetadataFromSections,
  createRoomsFromMapSection,
  generateRoomWaypointsForLevel
} from "./levelRoomLayoutLoader";
import {
  createKnownPopulationEntryIds,
  loadCharacterInventoryItems,
  loadRoomPopulationFromRoomsSection,
  parseCharacterDefinitions,
  parseItemDefinitions
} from "./levelRoomPopulationLoader";
import { createGeneratedIdentitySolution, createSolutionCategoryOptionsByName, loadSolutionsFromSection } from "./levelSolutionsLoader";
import ClozeBlank from "../solutions/types/ClozeBlank";
import ClozePartType from "../solutions/types/ClozePartType";
import Solution from "../solutions/types/Solution";
import { assertNormalizedId, normalizeOptionalId } from "../idUtil";

const DEFAULT_WIN_SYNOPSIS = "You completed the level.";

function _createDefaultSolutionCategoryOptions(level:Level):Map<string, string[]> {
  return new Map([
    ['rooms', level.rooms.map(room => room.title)],
    ['items', [
      ...level.rooms.flatMap(room => room.items),
      ...level.characters.flatMap(character => character.items)
    ].map(item => item.title)],
    ['characters', level.characters.map(character => character.title)]
  ]);
}

function _createEmptyLevel(duration:number = MSECS_IN_DAY):Level {
  return {
    rooms: [],
    initialCharacters: [],
    characters: [],
    solutions: [],
    winSynopsis: DEFAULT_WIN_SYNOPSIS,
    activeCharacterId: "",
    startTime: 0,
    duration,
    labels: _createTimeLabels(duration)
  };
}

function _parseTimeTextToMsecs(text:string):number {
  return parseTimestampToMsecs(text);
}

function _parseGeneralSection(generalSection:string):{ activeCharacterId:string, startTime:number|null, winSynopsis:string } {
  const generalNameValues = parseUniqueNameValueLines(generalSection, 'general', true);
  return {
    activeCharacterId: normalizeOptionalId(generalNameValues.activeCharacter) || "",
    startTime: generalNameValues.time ? _parseTimeTextToMsecs(generalNameValues.time) : null,
    winSynopsis: generalNameValues.winSynopsis || DEFAULT_WIN_SYNOPSIS
  };
}

function _formatMinutesAsTimeLabel(minutes:number):string {
  const wholeMinutes = Math.round(minutes);
  const hours24 = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  if (hours24 === 0 && mins === 0) return "midnight";
  if (hours24 === 12 && mins === 0) return "noon";
  const suffix = hours24 < 12 || hours24 === 24 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (mins === 0) return `${hours12}${suffix}`;
  return `${hours12}:${mins.toString().padStart(2, '0')}${suffix}`;
}

function _createTimeLabels(duration:number):TimeLabel[] {
  const durationMinutes = duration / MSECS_IN_MINUTE;
  const labels = [0, .25, .5, .75, 1].map(ratio => {
    const minutes = durationMinutes * ratio;
    return { minutes, label:_formatMinutesAsTimeLabel(minutes) };
  });
  const endLabel = labels[labels.length - 1]?.label || '';
  return labels.filter((timeLabel, index) => {
    if (index === labels.length - 1) return true;
    if (timeLabel.label === endLabel) return false;
    return labels.findIndex(candidate => candidate.label === timeLabel.label) === index;
  });
}

function _findSectionFirstContentLineNo(markdownText:string, sectionName:string, indentLevel:number = 1):number|null {
  const lines = markdownText.split('\n');
  const normalizedSectionName = normalizeMarkdownName(sectionName);
  const headingIndex = lines.findIndex(line => {
    const trimmedLeftLine = line.trimStart();
    const prefix = '#'.repeat(indentLevel);
    if (!trimmedLeftLine.startsWith(prefix)) return false;
    if (trimmedLeftLine.length === prefix.length) return false;
    const nextChar = trimmedLeftLine[prefix.length];
    if (nextChar !== ' ' && nextChar !== '\t') return false;
    return normalizeMarkdownName(trimmedLeftLine.slice(prefix.length).trim()) === normalizedSectionName;
  });
  if (headingIndex === -1) return null;

  for (let i = headingIndex + 1; i < lines.length; ++i) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.startsWith('#'.repeat(indentLevel) + ' ')) return null;
    if (trimmedLine.length > 0) return i + 1;
  }

  return null;
}

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown):never {
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof Error) throw new LoadLevelException(levelFilename, errorLineNo, error.message, error);
  throw new LoadLevelException(levelFilename, errorLineNo, String(error), error);
}

function _runWithLoadLevelSectionContext<T>(levelFilename:string, errorLineNo:number, callback:() => T):T {
  try {
    return callback();
  } catch (error) {
    _throwErrorWithLoadLevelContext(levelFilename, errorLineNo, error);
  }
}

type LoadLevelOptions = {
  validateUnlockPhrases?:boolean
}

function _normalizeSolutionCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

function _findMissingSolutionAnswerPhrases(solutions:Solution[], categoryOptionsByName:Map<string, string[]>):string[] {
  const availablePhrases = new Set(Array.from(categoryOptionsByName.values()).flat().map(_normalizeSolutionCategoryPhrase));
  const missingPhrases:string[] = [];

  solutions.forEach(solution => {
    solution.parts.forEach(part => {
      if (part.type !== ClozePartType.blank) return;
      const blank = part as ClozeBlank;
      blank.correctAnswerIndexes.forEach(answerIndex => {
        const answer = blank.availableAnswers[answerIndex] || '';
        const normalizedAnswer = _normalizeSolutionCategoryPhrase(answer);
        if (!answer || availablePhrases.has(normalizedAnswer) || missingPhrases.includes(answer)) return;
        missingPhrases.push(answer);
      });
    });
  });

  return missingPhrases;
}

function _validateUnlockableSolutionPhrases(level:Level, categoryOptionsByName:Map<string, string[]>, levelFilename:string, errorLineNo:number) {
  const missingPhrases = _findMissingSolutionAnswerPhrases(level.solutions, categoryOptionsByName);
  if (!missingPhrases.length) return;

  throw new LoadLevelException(
    levelFilename,
    errorLineNo,
    `missing solution answer phrases from solution categories: ${missingPhrases.join(', ')}`
  );
}

export function loadLevelFromText(text:string, levelFilename:string = '<inline>', options:LoadLevelOptions = {}):Level {
  const sections = _runWithLoadLevelSectionContext(levelFilename, 1,
    () => parseSections(text, 1, true));
  const generalFirstLineNo = _findSectionFirstContentLineNo(text, 'general') || 1;
  const mapFirstLineNo = _findSectionFirstContentLineNo(text, 'map') || 1;
  const roomsFirstLineNo = _findSectionFirstContentLineNo(text, 'rooms') || 1;
  const charactersFirstLineNo = _findSectionFirstContentLineNo(text, 'characters') || 1;
  const itemsFirstLineNo = _findSectionFirstContentLineNo(text, 'items') || 1;
  const itinerarySection = sections.itinerary || "";
  const itineraryFirstLineNo = _findSectionFirstContentLineNo(text, 'itinerary') || 1;
  const solutionsFirstLineNo = _findSectionFirstContentLineNo(text, 'solutions') || 1;
  const generalSection = _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
    () => _parseGeneralSection(sections.general || ""));
  let level = _createEmptyLevel();
  level = {
    ...level,
    activeCharacterId: generalSection.activeCharacterId || level.activeCharacterId,
    startTime: generalSection.startTime ?? level.startTime,
    winSynopsis: generalSection.winSynopsis || level.winSynopsis
  };
  const characterDefinitions = _runWithLoadLevelSectionContext(levelFilename, charactersFirstLineNo,
    () => parseCharacterDefinitions(sections.characters || ""));
  const itemDefinitions = _runWithLoadLevelSectionContext(levelFilename, itemsFirstLineNo,
    () => parseItemDefinitions(sections.items || ""));
  const roomPopulationDefinitions = { characterDefinitions, itemDefinitions };
  _runWithLoadLevelSectionContext(levelFilename, mapFirstLineNo,
    () => createRoomsFromMapSection(level, sections.map || ""));
  _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
    () => applyRoomMetadataFromSections(level, sections.rooms || ""));
  _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
    () => addRoomPositionMarkersFromSections(level, sections.rooms || "", createKnownPopulationEntryIds(roomPopulationDefinitions)));
  _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
    () => addRoomExitsFromRoomsSection(level, sections.rooms || ""));
  _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
    () => generateRoomWaypointsForLevel(level));
  _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
    () => loadRoomPopulationFromRoomsSection(level, sections.rooms || "", roomPopulationDefinitions));
  _runWithLoadLevelSectionContext(levelFilename, charactersFirstLineNo,
    () => loadCharacterInventoryItems(level, roomPopulationDefinitions));
  const solutionCategoryOptionsByName = _runWithLoadLevelSectionContext(levelFilename, solutionsFirstLineNo,
    () => createSolutionCategoryOptionsByName(sections.solutions || "", _createDefaultSolutionCategoryOptions(level)));
  const authoredSolutions = _runWithLoadLevelSectionContext(levelFilename, solutionsFirstLineNo,
    () => loadSolutionsFromSection(sections.solutions || "", solutionCategoryOptionsByName));
  const generatedIdentitySolution = authoredSolutions.some(solution => solution.id === 'identities')
    ? null
    : createGeneratedIdentitySolution(level.characters, solutionCategoryOptionsByName);
  level = {
    ...level,
    solutions:generatedIdentitySolution ? [generatedIdentitySolution, ...authoredSolutions] : authoredSolutions,
    initialCharacters:level.characters.map(duplicateCharacter)
  };
  const itineraryData = loadItineraries(level, itinerarySection, levelFilename, itineraryFirstLineNo);
  const initialCharacters = level.initialCharacters.map(initialCharacter => {
    const scheduledCharacter = itineraryData.characters.find(character => character.id === initialCharacter.id) || null;
    return scheduledCharacter ? {
      ...duplicateCharacter(initialCharacter),
      itinerary:scheduledCharacter.itinerary,
      itineraryIndex:scheduledCharacter.itineraryIndex
    } : duplicateCharacter(initialCharacter);
  });
  level = {
    ...level,
    initialCharacters,
    activeCharacterId: level.activeCharacterId || level.characters[0]?.id || "",
    characters: itineraryData.characters,
    duration: itineraryData.duration,
    labels: _createTimeLabels(itineraryData.duration)
  };
  if (level.activeCharacterId) assertNormalizedId(level.activeCharacterId, 'character');
  if (options.validateUnlockPhrases) _validateUnlockableSolutionPhrases(level, solutionCategoryOptionsByName, levelFilename, solutionsFirstLineNo);
  return level;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const response = await fetch(baseUrl(levelFileUrl));
  const text = await response.text();
  return loadLevelFromText(text, levelFileUrl, { validateUnlockPhrases:true });
}