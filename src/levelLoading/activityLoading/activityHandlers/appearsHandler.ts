/* This file parses and schedules character appearance activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for appearance activities. */
export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true);
  const appearanceId = makeIdentifier('appearanceId', 'AppearanceId');
  const rootParseStep = makeSequence([characterId, appears, as, appearanceId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an appearance activity into an editable timeline. */
export function scheduleAppearsActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  activity.endTime = activity.startTime;
  return true;
}