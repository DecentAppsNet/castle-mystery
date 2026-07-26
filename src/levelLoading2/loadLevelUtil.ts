import Level from "@/game/types/Level";
import ErrorCollector from "./errorCollection/ErrorCollector";
import { loadLevelSections } from "./levelFileSectionUtil";
import { initMutableLevelAndLoadingContext } from "./generalLoading/generalLoadingApi";
import { addRoomsToLevel, loadRoomsPartially } from "./roomLoading/roomLoadingApi";
import { loadItemsPartially } from "./itemLoading/itemLoadingApi";
import { addCharactersToLevel, loadCharactersPartially } from "./characterLoading/characterLoadingApi";
import { loadConclusions } from "./conclusionLoading/conclusionLoadingApi";

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
  // are stored in loadingContext now that will be set in level later.
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

  // Add items, characters, and rooms to level, resolving dependencies.
  if (!addRoomsToLevel(rooms, loadingContext.groundFloorRoomRef, level, errors)) return null;
  if (!addCharactersToLevel(characters, items, level, errors)) return null;
  
  // Build authored conclusions and synthesize the generated identities conclusion when needed.
  level.conclusions = loadConclusions(sections.conclusions?.text ?? '', characters, items, rooms, errors);

  // Schedule activities into replayable itinerary.

  // Reconcile general-section time settings against the scheduled itinerary.

  // Rebuild initial characters from the scheduled timelines and finalize runtime-facing level fields.
  // Apply final cross-character derived state and optional validation passes.
  // TODO - what is actrually needed?

  return errors.count <= originalErrorCount ? level : null;
}
