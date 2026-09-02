/* This file parses and schedules character speech activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeText, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { scheduleSpokenActivity } from "./util/spokenActivitySchedulingUtil";

/** Creates the accepted syntax for speech activities. */
export function createSaysParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const says = makeVerb('says');
  const text = makeText('text');
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, says, text, toSequence]);
  return createParseFormat(rootParseStep);
}

/** Schedules character speech and any target-facing change into an editable timeline. */
export function scheduleSaysActivity(level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  return scheduleSpokenActivity(level, activity, editableTimeline, errors);
}