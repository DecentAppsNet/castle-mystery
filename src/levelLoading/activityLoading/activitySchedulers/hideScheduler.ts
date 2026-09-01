/* This file parses and schedules character hiding activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assert } from "decent-portal";

/** Creates the accepted syntax for hiding activities. */
export function createHideParseFormat():ParseFormat {
  const hide = makeVerb('hide');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([hide, target]);
  return createParseFormat(rootParseStep);
}

/** Schedules a hiding activity into an editable timeline. */
export function scheduleHideActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  const { characterId, itemId } = activity.parts;
  assert(typeof characterId === 'string' || typeof itemId === 'string');
  activity.busyCharacterIds = typeof itemId === 'string' ? [] : [characterId as string];
  activity.endTime = activity.startTime;
  return true;
}