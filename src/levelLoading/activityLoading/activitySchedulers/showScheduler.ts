/* This file parses and schedules item visibility activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { scheduleVisibilityActivity } from "./util/visibilitySchedulingUtil";


/** Creates the accepted syntax for item-showing activities. */
export function createShowParseFormat():ParseFormat {
  const show = makeVerb('show');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([show, target]);
  return createParseFormat(rootParseStep);
}

/** Schedules an item or character becoming visible into an editable timeline. */
export function scheduleShowActivity(_level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  return scheduleVisibilityActivity(true, activity, editableTimeline, errors);
}