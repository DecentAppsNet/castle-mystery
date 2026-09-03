/* This file parses and schedules character hiding activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { scheduleVisibilityActivity } from "./util/visibilitySchedulingUtil";

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

/** Schedules an item or character becoming invisible into an editable timeline. */
export function scheduleHideActivity(_level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  return scheduleVisibilityActivity(false, activity, editableTimeline, errors);
}