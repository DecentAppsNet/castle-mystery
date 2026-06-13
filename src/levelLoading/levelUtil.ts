/* This module groups top-level level-loading orchestration, composing section-specific loaders into a validated Level model. 
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Level from "../game/types/Level";
import Item from "../game/types/Item";
import TimeLabel from "../game/types/TimeLabel";
import { duplicateCharacter } from "../game/types/Character";
import { getOwnedItems } from "../game/itemOwnershipUtil";
import { createItemsById } from "../game/itemUtil";
import { ROOM_MIDDLE_ROW_CENTER_Z } from "@/game/roomSpaceConstants";
import { rand } from "@/common/randUtil";
import { MINUTES_IN_DAY, MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { MarkdownLineError, normalizeMarkdownName, parseSectionEntriesWithLines, parseSections, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { formatMsecsAsTimestamp, parseTimestampToMsecs } from "@/levelLoading/timestampUtil";
import { loadLevelTextWithSourceLineMap, type SourceLineMap } from "./levelImportUtil";
import { loadItineraries } from "./levelItineraryLoader";
import LoadLevelException from "./LoadLevelException";
import {
  addRoomExitsFromRoomsSection,
  applyRoomMetadataFromSections,
  createRoomsFromMapSection,
  generateRoomWaypointsForLevel,
  validateRoomGridLegendEntries,
  validateMapLegendRoomsAgainstRoomsSection
} from "./levelRoomLayoutLoader";
import {
  createKnownPopulationEntryIds,
  loadCharacterInventoryItems,
  loadRoomPopulationFromRoomsSection,
  parseCharacterDefinitions,
  parseItemDefinitions
} from "./levelRoomPopulationLoader";
import { createGeneratedIdentityConclusion, createConclusionCategoryOptionsByName, loadConclusionsFromSection } from "./levelConclusionsLoader";
import ClozeBlank from "../game/conclusions/types/ClozeBlank";
import ClozePartType from "../game/conclusions/types/ClozePartType";
import Conclusion from "../game/conclusions/types/Conclusion";
import { assertNormalizedId, normalizeOptionalId } from "../game/idUtil";
import { isCharacterInteractive, isItemInteractive } from "../game/interactivityUtil";
import { calcRoomsBoundingRect, findRoomByIdOrTitle } from "../game/roomUtil";
import { getBackgroundImageAssetUrl } from "../game/imageUrlUtil";

const DEFAULT_WIN_SYNOPSIS = "You completed the level.";
const KNOWN_TOP_LEVEL_SECTION_NAMES = new Set(['general', 'map', 'rooms', 'characters', 'items', 'itinerary', 'conclusions']);

function _sortGeneratedConclusionOptions(options:string[]):string[] {
  return [...options].sort((option1, option2) => option1.localeCompare(option2, undefined, { sensitivity:'base' }));
}

function _createDefaultConclusionCategoryOptions(level:Level):Map<string, string[]> {
  return new Map([
    ['rooms', level.rooms.map(room => room.title)],
    ['items', _sortGeneratedConclusionOptions([
      ...level.rooms.flatMap(room => room.items),
      ...level.characters.flatMap(character => character.items)
    ].filter(isItemInteractive).map(item => item.title))],
    ['characters', _sortGeneratedConclusionOptions(level.characters.filter(isCharacterInteractive).map(character => character.title))]
  ]);
}

function _createEmptyLevel(duration:number = MSECS_IN_DAY):Level {
  return {
    rooms: [],
    initialCharacters: [],
    characters: [],
    itemsById: new Map<string, Item>(),
    discoverableCharacterCount: 0,
    discoverableItemCount: 0,
    discoverableRoomCount: 0,
    conclusions: [],
    winSynopsis: DEFAULT_WIN_SYNOPSIS,
    backgroundImageUrl: null,
    groundFloorY: 0,
    activeCharacterId: "",
    startTime: 0,
    initialTime: 0,
    endTime: duration,
    duration,
    labels: _createTimeLabels(0, duration)
  };
}

function _createLevelItemsById(level:Level, itemDefinitions:Map<string, { title:string, description:string, displayChar:string, imageUrl:string|null, drawOffset:{ x:number, y:number, z:number } }>):Map<string, Item> {
  const itemsById = createItemsById(level.rooms, level.characters);
  itemDefinitions.forEach((itemDefinition, itemId) => {
    if (itemsById.has(itemId)) return;
    itemsById.set(itemId, {
      id:itemId,
      title:itemDefinition.title,
      displayChar:itemDefinition.displayChar,
      imageUrl:itemDefinition.imageUrl,
      randomSalt:rand(),
      position:{ x:0, y:0, z:ROOM_MIDDLE_ROW_CENTER_Z },
      drawOffset:{ ...itemDefinition.drawOffset },
      description:itemDefinition.description,
      isDiscovered:false
    });
  });
  return itemsById;
}

function _parseTimeTextToMsecs(text:string):number {
  return parseTimestampToMsecs(text);
}

type ParsedGeneralSection = {
  activeCharacterId:string,
  startTime:number|null,
  initialTime:number|null,
  endTime:number|null,
  discoverableCharacterCount:number|null,
  discoverableItemCount:number|null,
  discoverableRoomCount:number|null,
  isCrossMidnight:boolean,
  backgroundImageUrl:string|null,
  groundFloorRoomRef:string|null,
  winSynopsis:string
};

function _parseOptionalDiscoverableCountOrThrow(value:string|undefined, propertyName:string):number|null {
  if (value === undefined) return null;
  const parsedValue = Number(value.trim());
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`general ${propertyName} must be a non-negative integer`);
  }
  return parsedValue;
}

function _parseGeneralSection(generalSection:string):ParsedGeneralSection {
  const generalNameValues = parseUniqueNameValueLines(generalSection, 'general', true);
  const startTime = generalNameValues.startTime ? _parseTimeTextToMsecs(generalNameValues.startTime) : null;
  const initialTime = generalNameValues.time ? _parseTimeTextToMsecs(generalNameValues.time) : null;
  const timelineStartTime = startTime ?? initialTime;
  const rawEndTime = generalNameValues.endTime ? _parseTimeTextToMsecs(generalNameValues.endTime) : null;
  const isCrossMidnight = rawEndTime !== null && timelineStartTime !== null && rawEndTime <= timelineStartTime;
  const endTime = rawEndTime === null
    ? null
    : isCrossMidnight ? rawEndTime + MSECS_IN_DAY : rawEndTime;
  return {
    activeCharacterId: normalizeOptionalId(generalNameValues.activeCharacter) || "",
    startTime,
    initialTime,
    endTime,
    discoverableCharacterCount:_parseOptionalDiscoverableCountOrThrow(generalNameValues.discoverableCharacterCount, 'discoverableCharacterCount'),
    discoverableItemCount:_parseOptionalDiscoverableCountOrThrow(generalNameValues.discoverableItemCount, 'discoverableItemCount'),
    discoverableRoomCount:_parseOptionalDiscoverableCountOrThrow(generalNameValues.discoverableRoomCount, 'discoverableRoomCount'),
    isCrossMidnight,
    backgroundImageUrl: generalNameValues.background ? getBackgroundImageAssetUrl(generalNameValues.background) : null,
    groundFloorRoomRef: generalNameValues.groundFloorRoom || null,
    winSynopsis: generalNameValues.winSynopsis || DEFAULT_WIN_SYNOPSIS
  };
}

function _countDiscoverableCharacters(level:Pick<Level, 'characters'>):number {
  return level.characters.filter(isCharacterInteractive).length;
}

function _countDiscoverableItems(level:Pick<Level, 'rooms' | 'characters'>):number {
  const discoverableItemIds = new Set<string>();
  level.rooms.forEach(room => room.items.forEach(item => {
    if (!isItemInteractive(item)) return;
    discoverableItemIds.add(item.id);
  }));
  level.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (!isItemInteractive(item)) return;
    discoverableItemIds.add(item.id);
  }));
  return discoverableItemIds.size;
}

function _countDiscoverableRooms(level:Pick<Level, 'rooms'>):number {
  return level.rooms.length;
}

function _formatMinutesAsTimeLabel(minutes:number):string {
  const wholeMinutes = Math.round(minutes);
  const wallClockMinutes = ((wholeMinutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours24 = Math.floor(wallClockMinutes / 60);
  const mins = wallClockMinutes % 60;
  if (hours24 === 0 && mins === 0) return "midnight";
  if (hours24 === 12 && mins === 0) return "noon";
  const suffix = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  if (mins === 0) return `${hours12}${suffix}`;
  return `${hours12}:${mins.toString().padStart(2, '0')}${suffix}`;
}

function _createTimeLabels(startTime:number, duration:number):TimeLabel[] {
  const startMinutes = startTime / MSECS_IN_MINUTE;
  const durationMinutes = duration / MSECS_IN_MINUTE;
  const labels = [0, .25, .5, .75, 1].map(ratio => {
    const minutes = startMinutes + durationMinutes * ratio;
    return { minutes, label:_formatMinutesAsTimeLabel(minutes) };
  });
  const endLabel = labels[labels.length - 1]?.label || '';
  return labels.filter((timeLabel, index) => {
    if (index === 0) return true;
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

function _validateKnownTopLevelSections(text:string) {
  parseSectionEntriesWithLines(text, 1, true).forEach(sectionEntry => {
    if (KNOWN_TOP_LEVEL_SECTION_NAMES.has(sectionEntry.name)) return;
    throw new MarkdownLineError(sectionEntry.lineNo, `unknown top-level section '${sectionEntry.name}'`);
  });
}

function _throwErrorWithLoadLevelContext(levelFilename:string, errorLineNo:number, error:unknown):never {
  if (error instanceof LoadLevelException) throw error;
  if (error instanceof MarkdownLineError) throw new LoadLevelException(levelFilename, error.lineNo, error.message, error);
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
  validateUnlockPhrases?:boolean,
  sourceLineMap?:SourceLineMap
}

function _translateLoadLevelException(error:LoadLevelException, sourceLineMap:SourceLineMap):LoadLevelException {
  const sourceLine = sourceLineMap[error.errorLineNo - 1] || null;
  if (!sourceLine) return error;
  if (sourceLine.filename === error.levelFilename && sourceLine.lineNo === error.errorLineNo) return error;
  return new LoadLevelException(sourceLine.filename, sourceLine.lineNo, error.detailMessage, error.cause);
}

function _normalizeConclusionCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

function _findMissingConclusionAnswerPhrases(conclusions:Conclusion[], categoryOptionsByName:Map<string, string[]>):string[] {
  const availablePhrases = new Set(Array.from(categoryOptionsByName.values()).flat().map(_normalizeConclusionCategoryPhrase));
  const missingPhrases:string[] = [];

  conclusions.forEach(conclusion => {
    conclusion.parts.forEach(part => {
      if (part.type !== ClozePartType.blank) return;
      const blank = part as ClozeBlank;
      blank.correctAnswerIndexes.forEach(answerIndex => {
        const answer = blank.availableAnswers[answerIndex] || '';
        const normalizedAnswer = _normalizeConclusionCategoryPhrase(answer);
        if (!answer || availablePhrases.has(normalizedAnswer) || missingPhrases.includes(answer)) return;
        missingPhrases.push(answer);
      });
    });
  });

  return missingPhrases;
}

function _validateUnlockableConclusionPhrases(level:Level, categoryOptionsByName:Map<string, string[]>, levelFilename:string, errorLineNo:number) {
  const missingPhrases = _findMissingConclusionAnswerPhrases(level.conclusions, categoryOptionsByName);
  if (!missingPhrases.length) return;

  throw new LoadLevelException(
    levelFilename,
    errorLineNo,
    `missing conclusion answer phrases from conclusion categories: ${missingPhrases.join(', ')}`
  );
}

function _validateHasLoadedCharacters(level:Level) {
  if (level.characters.length > 0) return;
  throw new Error('level must include at least one placed character');
}

function _validateActiveCharacterId(activeCharacterId:string, characters:Level['characters']) {
  if (!activeCharacterId) return;
  if (characters.some(character => character.id === activeCharacterId)) return;
  throw new Error(`general activeCharacter '${activeCharacterId}' does not match any character in the level`);
}

function _findGroundFloorY(level:Level, groundFloorRoomRef:string|null):number {
  if (!groundFloorRoomRef) {
    const roomBounds = calcRoomsBoundingRect(level.rooms);
    return roomBounds.y + roomBounds.height;
  }

  const groundFloorRoom = findRoomByIdOrTitle(level.rooms, groundFloorRoomRef);
  return groundFloorRoom.rect.y + groundFloorRoom.rect.height;
}

function _validateGroundFloorRoomReference(level:Level, groundFloorRoomRef:string|null) {
  if (!groundFloorRoomRef) return;
  try {
    findRoomByIdOrTitle(level.rooms, groundFloorRoomRef);
  } catch {
    throw new Error(`general groundFloorRoom '${groundFloorRoomRef}' does not match any room in the level`);
  }
}

function _validateOutsideRoomsAgainstGroundFloor(level:Level, groundFloorRoomRef:string|null, groundFloorY:number) {
  if (!groundFloorRoomRef) return;
  const undergroundOutsideRoom = level.rooms.find(room => room.isOutside && room.rect.y >= groundFloorY) || null;
  if (!undergroundOutsideRoom) return;
  throw new Error(`outside room '${undergroundOutsideRoom.title || undergroundOutsideRoom.id}' is below general groundFloorRoom '${groundFloorRoomRef}'`);
}

function _levelUrlToFilename(levelUrl:string):string {
  const urlSegments = levelUrl.split('/').filter(segment => segment.length > 0);
  return urlSegments[urlSegments.length - 1] || levelUrl;
}

function _resolveExplicitEndTime(endTime:number|null, startTime:number):number|null {
  if (endTime === null) return null;
  return endTime <= startTime ? endTime + MSECS_IN_DAY : endTime;
}

function _trimLeadingBlankLines(text:string):string {
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  return lines.join('\n');
}

function _validateInitialTimeWithinTimeline(initialTime:number, startTime:number, endTime:number) {
  if (initialTime < startTime || initialTime > endTime) {
    throw new Error(`general time ${formatMsecsAsTimestamp(initialTime)} must fall within the authored span ${formatMsecsAsTimestamp(startTime)} to ${formatMsecsAsTimestamp(endTime)}`);
  }
}

function _shouldValidateExplicitInitialTime(generalSection:ParsedGeneralSection):boolean {
  return generalSection.initialTime !== null && (generalSection.startTime !== null || generalSection.endTime !== null);
}

function _validateExplicitStartTimeAgainstItinerary(explicitStartTime:number|null, earliestResolvedActivityTime:number|null) {
  if (explicitStartTime === null || earliestResolvedActivityTime === null || earliestResolvedActivityTime >= explicitStartTime) return;
  throw new Error(
    `general startTime ${formatMsecsAsTimestamp(explicitStartTime)} excludes itinerary content at ${formatMsecsAsTimestamp(earliestResolvedActivityTime)}. Try startTime=${formatMsecsAsTimestamp(earliestResolvedActivityTime)}`
  );
}

function _validateExplicitEndTimeAgainstItinerary(explicitEndTime:number|null, latestResolvedEventEndTime:number|null) {
  if (explicitEndTime === null || latestResolvedEventEndTime === null || latestResolvedEventEndTime <= explicitEndTime) return;
  throw new Error(
    `general endTime ${formatMsecsAsTimestamp(explicitEndTime)} excludes itinerary content ending at ${formatMsecsAsTimestamp(latestResolvedEventEndTime)}. Try endTime=${formatMsecsAsTimestamp(latestResolvedEventEndTime)}`
  );
}

export function loadLevelFromText(text:string, levelFilename:string = '<inline>', options:LoadLevelOptions = {}):Level {
  try {
    _runWithLoadLevelSectionContext(levelFilename, 1,
      () => _validateKnownTopLevelSections(text));
    const sections = _runWithLoadLevelSectionContext(levelFilename, 1,
      () => parseSections(text, 1, true));
    const generalFirstLineNo = _findSectionFirstContentLineNo(text, 'general') || 1;
    const mapFirstLineNo = _findSectionFirstContentLineNo(text, 'map') || 1;
    const roomsFirstLineNo = _findSectionFirstContentLineNo(text, 'rooms') || 1;
    const charactersFirstLineNo = _findSectionFirstContentLineNo(text, 'characters') || 1;
    const itemsFirstLineNo = _findSectionFirstContentLineNo(text, 'items') || 1;
    const itinerarySection = _trimLeadingBlankLines(sections.itinerary || "");
    const itineraryFirstLineNo = _findSectionFirstContentLineNo(text, 'itinerary') || 1;
    const conclusionsFirstLineNo = _findSectionFirstContentLineNo(text, 'conclusions') || 1;
    const generalSection = _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _parseGeneralSection(sections.general || ""));
    let level = _createEmptyLevel();
    const loadStartTime = generalSection.startTime ?? generalSection.initialTime ?? level.startTime;
    const loadEndTime = _resolveExplicitEndTime(generalSection.endTime, loadStartTime);
    level = {
      ...level,
      activeCharacterId: generalSection.activeCharacterId || level.activeCharacterId,
      startTime: loadStartTime,
      initialTime: generalSection.initialTime ?? loadStartTime,
      endTime: loadEndTime ?? (loadStartTime + level.duration),
      backgroundImageUrl: generalSection.backgroundImageUrl,
      winSynopsis: generalSection.winSynopsis || level.winSynopsis
    };
    const characterDefinitions = _runWithLoadLevelSectionContext(levelFilename, charactersFirstLineNo,
      () => parseCharacterDefinitions(sections.characters || "", charactersFirstLineNo));
    const itemDefinitions = _runWithLoadLevelSectionContext(levelFilename, itemsFirstLineNo,
      () => parseItemDefinitions(sections.items || "", itemsFirstLineNo));
    const roomPopulationDefinitions = { characterDefinitions, itemDefinitions };
    _runWithLoadLevelSectionContext(levelFilename, mapFirstLineNo,
      () => createRoomsFromMapSection(level, sections.map || "", mapFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => validateMapLegendRoomsAgainstRoomsSection(sections.map || "", sections.rooms || "", mapFirstLineNo, roomsFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => applyRoomMetadataFromSections(level, sections.rooms || "", roomsFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _validateGroundFloorRoomReference(level, generalSection.groundFloorRoomRef));
    const groundFloorY = _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _findGroundFloorY(level, generalSection.groundFloorRoomRef));
    _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _validateOutsideRoomsAgainstGroundFloor(level, generalSection.groundFloorRoomRef, groundFloorY));
    level = {
      ...level,
      groundFloorY
    };
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => validateRoomGridLegendEntries(level, sections.rooms || "", createKnownPopulationEntryIds(roomPopulationDefinitions), roomsFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => addRoomExitsFromRoomsSection(level, sections.rooms || "", itemDefinitions, roomsFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => generateRoomWaypointsForLevel(level));
    _runWithLoadLevelSectionContext(levelFilename, roomsFirstLineNo,
      () => loadRoomPopulationFromRoomsSection(level, sections.rooms || "", roomPopulationDefinitions, roomsFirstLineNo));
    _runWithLoadLevelSectionContext(levelFilename, charactersFirstLineNo,
      () => loadCharacterInventoryItems(level, roomPopulationDefinitions));
    _runWithLoadLevelSectionContext(levelFilename, charactersFirstLineNo,
      () => _validateHasLoadedCharacters(level));
    _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _validateActiveCharacterId(level.activeCharacterId, level.characters));
    const conclusionCategoryOptionsByName = _runWithLoadLevelSectionContext(levelFilename, conclusionsFirstLineNo,
      () => createConclusionCategoryOptionsByName(sections.conclusions || "", _createDefaultConclusionCategoryOptions(level), conclusionsFirstLineNo));
    const authoredConclusions = _runWithLoadLevelSectionContext(levelFilename, conclusionsFirstLineNo,
      () => loadConclusionsFromSection(sections.conclusions || "", level.rooms, conclusionCategoryOptionsByName, level.characters, conclusionsFirstLineNo));
    const generatedIdentityConclusion = authoredConclusions.some(conclusion => conclusion.id === 'identities')
      ? null
      : createGeneratedIdentityConclusion(level.characters, conclusionCategoryOptionsByName);
    const discoverableCharacterCount = generalSection.discoverableCharacterCount ?? _countDiscoverableCharacters(level);
    const discoverableItemCount = generalSection.discoverableItemCount ?? _countDiscoverableItems(level);
    const discoverableRoomCount = generalSection.discoverableRoomCount ?? _countDiscoverableRooms(level);
    level = {
      ...level,
      discoverableCharacterCount,
      discoverableItemCount,
      discoverableRoomCount,
      conclusions:generatedIdentityConclusion ? [generatedIdentityConclusion, ...authoredConclusions] : authoredConclusions,
      initialCharacters:level.characters.map(duplicateCharacter)
    };
    const itineraryData = loadItineraries(level, itinerarySection, levelFilename, itineraryFirstLineNo, {
      isCrossMidnight: generalSection.isCrossMidnight,
      explicitEndTime: loadEndTime
    });
    const resolvedStartTime = generalSection.startTime
      ?? generalSection.initialTime
      ?? itineraryData.resolvedTimeline.earliestAbsoluteActivityTime
      ?? itineraryData.resolvedTimeline.earliestResolvedActivityTime
      ?? level.startTime;
    const resolvedEndTime = _resolveExplicitEndTime(generalSection.endTime, resolvedStartTime)
      ?? itineraryData.resolvedTimeline.latestResolvedEventEndTime
      ?? resolvedStartTime;
    const resolvedInitialTime = generalSection.initialTime ?? resolvedStartTime;
    _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _validateExplicitStartTimeAgainstItinerary(generalSection.startTime, itineraryData.resolvedTimeline.earliestResolvedActivityTime));
    _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
      () => _validateExplicitEndTimeAgainstItinerary(_resolveExplicitEndTime(generalSection.endTime, resolvedStartTime), itineraryData.resolvedTimeline.latestResolvedEventEndTime));
    if (_shouldValidateExplicitInitialTime(generalSection)) {
      _runWithLoadLevelSectionContext(levelFilename, generalFirstLineNo,
        () => _validateInitialTimeWithinTimeline(resolvedInitialTime, resolvedStartTime, resolvedEndTime));
    }
    const initialCharacters = level.initialCharacters.map(initialCharacter => {
      const scheduledCharacter = itineraryData.characters.find(character => character.id === initialCharacter.id) || null;
      return scheduledCharacter ? {
        ...duplicateCharacter(initialCharacter),
        itinerary:scheduledCharacter.itinerary,
        itineraryIndex:scheduledCharacter.itineraryIndex
      } : duplicateCharacter(initialCharacter);
    });
    const resolvedDuration = resolvedEndTime - resolvedStartTime;
    level = {
      ...level,
      initialCharacters,
      activeCharacterId: level.activeCharacterId || level.characters[0]?.id || "",
      characters: itineraryData.characters,
      itemsById: _createLevelItemsById({ ...level, characters:itineraryData.characters }, itemDefinitions),
      startTime: resolvedStartTime,
      initialTime: resolvedInitialTime,
      endTime: resolvedEndTime,
      duration: resolvedDuration,
      labels: _createTimeLabels(resolvedStartTime, resolvedDuration)
    };
    if (level.activeCharacterId) assertNormalizedId(level.activeCharacterId, 'character');
    if (options.validateUnlockPhrases) _validateUnlockableConclusionPhrases(level, conclusionCategoryOptionsByName, levelFilename, conclusionsFirstLineNo);
    return level;
  } catch (error) {
    if (error instanceof LoadLevelException && options.sourceLineMap) {
      throw _translateLoadLevelException(error, options.sourceLineMap);
    }
    throw error;
  }
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<Level> {
  const sourceMappedText = await loadLevelTextWithSourceLineMap(_levelUrlToFilename(levelFileUrl));
  return loadLevelFromText(sourceMappedText.text, levelFileUrl, {
    validateUnlockPhrases:true,
    sourceLineMap:sourceMappedText.sourceLineMap
  });
}