/* This file parses and schedules item transformation activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for item transformation activities. */
export function createBecomesParseFormat():ParseFormat {
  const itemId = makeIdentifier('itemId', 'ItemId');
  const becomes = makeVerb('becomes');
  const toItemId = makeIdentifier('toItemId', 'ItemId');
  const rootParseStep = makeSequence([itemId, becomes, toItemId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an item transformation activity into an editable timeline. */
export function scheduleBecomesActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  // TODO
  activity.endTime = activity.startTime;
  return true;
}