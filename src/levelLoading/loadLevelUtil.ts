import Level from "@/game/types/Level";
import { ErrorCollector } from "./errorCollection";
import { loadLevelSections } from "./levelFileSectionUtil";
import { initMutableLevelAndLoadingContext } from "./generalLoading";
import { addRoomsToLevel, loadRoomsPartially } from "./roomLoading";
import { addItemsToLevel, loadItemsPartially } from "./itemLoading";
import { addCharactersToLevel, loadCharactersPartially } from "./characterLoading";
import { loadConclusions } from "./conclusionLoading";
import { findLastActivityEndTime, findStartTimeFromItinerary, loadActivitiesPartially } from "./activityLoading";
import { scheduleActivities } from "./timelineLoading";
import { findDiscoverableCounts } from "./discoverability";
import { loadLevelWithImportsAndSourceLineMap } from "./importing";
import { createTimeLabels } from "./timeLabels";
import { assert } from "decent-portal";
import { clamp } from "@/common/numberUtil";

function _levelUrlToFilename(levelUrl:string):string {
  const urlSegments = levelUrl.split('/').filter(segment => segment.length > 0);
  return urlSegments[urlSegments.length - 1] || levelUrl;
}

function _getInitialTimeValue(authoredInitialTime:number|null, levelStartTime:number, levelEndTime:number):number {
  assert(levelStartTime <= levelEndTime);
  if (authoredInitialTime === null) return levelStartTime;
  return clamp(authoredInitialTime, levelStartTime, levelEndTime);
}

/** 
 * Error handling design:
 * If an error is caused by the level file input, then this is considered an
 * an expected condition and the error should be logged with the passed-in `errors` object.
 * Otherwise, debug errors can be caught with assert*() calls to check invariants or
 * even just uncaught exceptions. We should not have code that bucket-catches unexpected 
 * exceptions and logs via `.errors`.
*/
export function loadLevelFromText(text:string, errors:ErrorCollector):Level|null {
  const originalErrorCount = errors.count;
  
  // Load sections from authored level file.
  const sections = loadLevelSections(text, errors);
  if (!sections) return null;
  
  // Create the initial level shell and loading context. Level will be partially populated
  // based on general section values, but not all available values are assigned. General rule is
  // to completely validate a value before assigning it to level. So some "waiting" values 
  // are stored in loadingContext now that will be used to set members in level later.
  const initResult = initMutableLevelAndLoadingContext(sections, errors);
  if (!initResult) return null;
  const { level, loadingContext } = initResult;

  // Partially load items, characters, and rooms, avoiding loading of any dependencies.
  const items = loadItemsPartially(sections.items?.text ?? '', errors); // Items are still missing positions.
  if (!items) return null;
  const rooms = loadRoomsPartially(sections, items, errors); // Rooms still missing inventory. Side effect - items receive positions.
  if (!rooms) return null;
  const characters = loadCharactersPartially(sections.characters.text, sections.rooms.text, rooms, errors); // Characters still missing inventory.
  if (!characters) return null;
  level.startTime = findStartTimeFromItinerary(sections.itinerary?.text ?? '') ?? 0;
  const activities = loadActivitiesPartially(sections.itinerary?.text ?? '', loadingContext.activityParsingRules, 
      level.startTime, loadingContext.activeCharacterId, errors);
  if (!activities) return null;

  if (loadingContext.initialTime === null) level.initialTime = level.startTime;

  // Add items, characters, and rooms to level, resolving dependencies.
  if (!addRoomsToLevel(rooms, loadingContext.groundFloorRoomRef, level, errors)) return null;
  if (!addCharactersToLevel(characters, items, level, errors)) return null;
  if (!addItemsToLevel(items, activities, rooms, level, errors)) return null;
  
  // Build authored conclusions and synthesize the generated identities conclusion when needed.
  level.conclusions = loadConclusions(sections.conclusions?.text ?? '', characters, items, rooms, errors);

  // Schedule activities into timeline data structure.
  const timeline = scheduleActivities(level, activities, errors);
  if (!timeline) return null;
  level.timeline = timeline;
  level.endTime = findLastActivityEndTime(activities) ?? level.startTime;
  level.initialTime = _getInitialTimeValue(loadingContext.initialTime, level.startTime, level.endTime);

  // Set counts of discoverable room, items, and characters.
  const counts = findDiscoverableCounts(level, activities);
  level.discoverableCharacterCount = loadingContext.discoverableCharacterCount ?? counts.discoverableCharacterCount;
  level.discoverableItemCount = loadingContext.discoverableItemCount ?? counts.discoverableItemCount;
  level.discoverableRoomCount = loadingContext.discoverableRoomCount ?? counts.discoverableRoomCount;

  level.labels = createTimeLabels(level.startTime, level.endTime);

  return errors.count <= originalErrorCount ? level : null;
}

export async function loadLevelFromUrl(levelFileUrl:string):Promise<{level:Level|null, errors:ErrorCollector}> {
  const filename = _levelUrlToFilename(levelFileUrl); // For security, any extra path information is stripped. Level files will be retrieved from a fixed location later.
  const sourceMappedText = await loadLevelWithImportsAndSourceLineMap(filename);
  const errors = new ErrorCollector(sourceMappedText.text, sourceMappedText.sourceLineMap);
  const level = loadLevelFromText(sourceMappedText.text, errors);
  return { level, errors };
}