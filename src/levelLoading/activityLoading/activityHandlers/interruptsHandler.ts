/* This file parses and schedules speech interruption activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeText, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for interruption activities. */
export function createInterruptsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const interrupts = makeVerb('interrupts');
  const text = makeText();
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, interrupts, text, toSequence]);
  return createParseFormat(rootParseStep);
}

/** Schedules interrupted speech into an editable timeline. */
export function scheduleInterruptsActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  activity.endTime = activity.startTime;
  return true;
}