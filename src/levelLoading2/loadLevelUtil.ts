import Level from "@/game/types/Level";
import ErrorCollector from "./errorCollection/ErrorCollector";
import { loadLevelSections } from "./levelFileSectionUtil";
import { initMutableLevelAndLoadingContext } from "./parseGeneralUtil";
import { assertNonNullable } from "decent-portal";

/** 
 * Error handling design:
 * If an error is caused by the level file input, then this is considered an
 * an expected condition and the error should be logged with the passed-in `errors` object.
 * Otherwise, debug errors can be caught with assert*() calls to check invariants or
 * even just uncaught exceptions. We should not have code that bucket-catches unexpected 
 * exceptions and logs via `.errors`.
*/
export function loadLevelFromText(text:string, errors:ErrorCollector):Level|null {
  
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
  assertNonNullable(loadingContext);

  // Build the static room layout and validate room-level metadata.

  // Populate the rooms with exits, waypoints, characters, items, and inventories.

  // Build authored conclusions and synthesize the generated identities conclusion when needed.

  // Schedule itinerary activities into replayable itinerary.

  // Reconcile general-section time settings against the scheduled itinerary.

  // Rebuild initial characters from the scheduled timelines and finalize runtime-facing level fields.
  // Apply final cross-character derived state and optional validation passes.
  // TODO - what is actrually needed?

  return level;
}
