/* This file parses and schedules item transformation activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

type PartsShape = { itemId:string, toItemId:string };

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
  
  const { itemId, toItemId } = activity.parts as PartsShape;
  activity.busyCharacterIds = [];
  activity.busyItemIds = [itemId, toItemId];
  activity.endTime = activity.startTime;

  // TODO
  /*
   x === y is authoring error
  if y is placed in any room or character, it's an authoring error

  at activity start keyframe
    remove itemX from where it is, noting ownership/position
    use the item Y from level.itemsById, duplicating it, setting position
    add item Y to where item X was
  */
 
  return true;
}