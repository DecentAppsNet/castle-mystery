import { MINUTES_IN_DAY, MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import Item from "@/game/types/Item";
import { MutableLevel } from "@/game/types/Level";
import TimeLabel from "@/game/types/TimeLabel";
import LevelFileSections from "../types/LevelFileSections";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { findNameValueLineNo, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { normalizeOptionalId } from "@/game/idUtil";
import { parseTimestampToMsecs } from "../activityLoading/timestampUtil";
import { assert, assertNonNullable } from "decent-portal";
import { getBackgroundImageAssetUrl } from "@/game/imageUrlUtil";
import { AllowedValuesByIdentifierId } from "../activityLoading/types/ActivityParsingRules";
import LevelLoadingContext from "../types/LevelLoadingContext";
import { initActivityParsingRules } from "../activityLoading/parseItineraryUtil";
import { getSectionIdsFromSectionText, isSectionRequired } from "../levelFileSectionUtil";

const DEFAULT_WIN_SYNOPSIS = 'You won the level!';

function _parseOptionalDiscoverableCount(value:string|undefined, propertyName:string, generalSectionText:string, errors:ErrorCollector):number|null {
  if (value === undefined) return null;
  const parsedValue = Number(value.trim());
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    const lineNo = findNameValueLineNo(generalSectionText, propertyName);
    assert(lineNo !== -1);
    errors.addAt(`"${parsedValue}" is not an integer.`, 'general', `* ${propertyName}=`, value);
  }
  return parsedValue;
}

function _getAllowedValuesFromSubSectionIds(sections:LevelFileSections, sectionId:string, errors:ErrorCollector):string[] {
  const section = sections[sectionId];
  if (!section) return [];
  return getSectionIdsFromSectionText(section.text, 2, sectionId, errors);
}

function _getAppearanceIdAllowedValues(charactersSectionText:string, errors:ErrorCollector):string[] {
  return getSectionIdsFromSectionText(charactersSectionText, 3, 'characters', errors);
}

function _createAllowedValuesByIdentifier(sections:LevelFileSections, errors:ErrorCollector):AllowedValuesByIdentifierId {
  const av:AllowedValuesByIdentifierId = {};
  av['RoomId'] = _getAllowedValuesFromSubSectionIds(sections, 'rooms', errors);
  av['CharacterId'] = _getAllowedValuesFromSubSectionIds(sections, 'characters', errors);
  av['ItemId'] = _getAllowedValuesFromSubSectionIds(sections, 'items', errors);
  av['AppearanceId'] = _getAppearanceIdAllowedValues(sections.characters.text, errors);
  return av;
}

function _parseGeneralSection(generalSectionText:string, level:MutableLevel, errors:ErrorCollector):LevelLoadingContext {
  const generalNameValues = parseUniqueNameValueLines(generalSectionText, 'general', true);
  const startTime = generalNameValues.startTime ? parseTimestampToMsecs(generalNameValues.startTime) : null;
  const initialTime = generalNameValues.time ? parseTimestampToMsecs(generalNameValues.time) : null;
  const timelineStartTime = startTime ?? initialTime;
  const rawEndTime = generalNameValues.endTime ? parseTimestampToMsecs(generalNameValues.endTime) : null;
  const isCrossMidnight = rawEndTime !== null && timelineStartTime !== null && rawEndTime <= timelineStartTime;
  const endTime = rawEndTime === null
    ? null
    : isCrossMidnight ? rawEndTime + MSECS_IN_DAY : rawEndTime;

  const discoverableCharacterCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableCharacterCount, 'discoverableCharacterCount', generalSectionText, errors);
  const discoverableItemCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableItemCount, 'discoverableItemCount', generalSectionText, errors);
  const discoverableRoomCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableRoomCount, 'discoverableRoomCount', generalSectionText, errors);

  level.winSynopsis = generalNameValues.winSynopsis || DEFAULT_WIN_SYNOPSIS;
  level.backgroundImageUrl = generalNameValues.background ? getBackgroundImageAssetUrl(generalNameValues.background) : null;

  return {
    activeCharacterId: normalizeOptionalId(generalNameValues.activeCharacter) || "",
    startTime,
    initialTime,
    endTime,
    discoverableCharacterCount,
    discoverableItemCount,
    discoverableRoomCount,
    isCrossMidnight,
    groundFloorRoomRef: generalNameValues.groundFloorRoom || null,
    activityParsingRules:null
  };
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

function _createEmptyMutableLevel():MutableLevel {
  return {
    rooms: [],
    initialCharacters: [],
    characters: [],
    allCharactersById: new Map(),
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
    endTime: 0,
    duration: 0,
    labels: _createTimeLabels(0, 0)
  };
}

export function initMutableLevelAndLoadingContext(sections:LevelFileSections, errors:ErrorCollector):{level:MutableLevel, loadingContext:LevelLoadingContext}|null {
  const level = _createEmptyMutableLevel();
  assert(isSectionRequired('general'));
  assertNonNullable(sections.general, 'missing required section should have failed level load earlier.');
  const loadingContext = _parseGeneralSection(sections.general.text, level, errors);
  const allowedValuesByIdentifier = _createAllowedValuesByIdentifier(sections, errors);
  loadingContext.activityParsingRules = initActivityParsingRules(allowedValuesByIdentifier);
  return errors.hasErrors ? null : { level, loadingContext };
}