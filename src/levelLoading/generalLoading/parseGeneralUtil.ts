/* This file parses general level metadata and initializes deferred loading context.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createDefaultMutableLevel, MutableLevel } from "@/game/types/Level";
import LevelFileSections from "../types/LevelFileSections";
import { ErrorCollector } from "../errorCollection";
import { findNameValueLineNo, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { normalizeOptionalId } from "@/game/idUtil";
import { initActivityParsingRules, parseTimestampToMsecs } from "../activityLoading";
import { assert, assertNonNullable } from "decent-portal";
import { getBackgroundImageAssetUrl } from "@/game/imageUrlUtil";
import ActivityParsingRules, { AllowedValuesByIdentifierId } from "../activityLoading/types/ActivityParsingRules";
import LevelLoadingContext from "../types/LevelLoadingContext";
import { getSectionIdsFromSectionText, isSectionRequired } from "../levelFileSectionUtil";
import { findActiveCharacterFromItinerary } from "../activityLoading";

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
  const initialTime = generalNameValues.time ? parseTimestampToMsecs(generalNameValues.time) : null;
  
  const discoverableCharacterCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableCharacterCount, 'discoverableCharacterCount', generalSectionText, errors);
  const discoverableItemCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableItemCount, 'discoverableItemCount', generalSectionText, errors);
  const discoverableRoomCount = _parseOptionalDiscoverableCount(
    generalNameValues.discoverableRoomCount, 'discoverableRoomCount', generalSectionText, errors);

  level.winSynopsis = generalNameValues.winSynopsis || DEFAULT_WIN_SYNOPSIS;
  level.backgroundImageUrl = generalNameValues.background ? getBackgroundImageAssetUrl(generalNameValues.background) : null;
  
  if (initialTime !== null) level.initialTime = initialTime;

  const activityParsingRules:ActivityParsingRules = {} as ActivityParsingRules;
  return {
    activeCharacterId: normalizeOptionalId(generalNameValues.activeCharacter) || "",
    initialTime,
    discoverableCharacterCount,
    discoverableItemCount,
    discoverableRoomCount,
    groundFloorRoomRef: generalNameValues.groundFloorRoom || null,
    activityParsingRules // Placeholder assignment to be overwritten by caller.
  };
}

/** Initializes a mutable level and the context needed to resolve dependent authored values. */
export function initMutableLevelAndLoadingContext(sections:LevelFileSections, errors:ErrorCollector):{level:MutableLevel, loadingContext:LevelLoadingContext}|null {
  const level = createDefaultMutableLevel();
  level.winSynopsis = DEFAULT_WIN_SYNOPSIS;
  assert(isSectionRequired('general'));
  assertNonNullable(sections.general, 'missing required section should have failed level load earlier.');
  const loadingContext = _parseGeneralSection(sections.general.text, level, errors);
  const allowedValuesByIdentifier = _createAllowedValuesByIdentifier(sections, errors);
  loadingContext.activityParsingRules = initActivityParsingRules(allowedValuesByIdentifier); // Fixes the placeholder.
  level.activeCharacterId = loadingContext.activeCharacterId ?? findActiveCharacterFromItinerary(sections.itinerary,
    loadingContext.activityParsingRules, errors);
  return errors.hasErrors ? null : { level, loadingContext };
}