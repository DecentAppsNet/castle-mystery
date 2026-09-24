/* This file parses and schedules character sitting activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteralOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert } from "decent-portal";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { schedulePostureActivity } from "./util/postureSchedulingUtil";

type SitsParts = { characterId:string, targetItemId?:string };

/** Creates the accepted syntax for sitting activities. */
export function createSitsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('sits'),
    makeSequence([
      makeLiteralOptions(['on', 'above', 'in', 'over', 'at']),
      makeIdentifier('targetItemId', 'ItemId')
    ], true)
  ]);
  return createParseFormat(rootParseStep);
}

/** Schedules a sitting posture into an editable timeline. */
export function scheduleSitsActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, targetItemId } = activity.parts as SitsParts;
  assert(typeof characterId === 'string');
  assert(targetItemId === undefined || typeof targetItemId === 'string');
  return schedulePostureActivity('sitting', level, waypointContext, activity, editableTimeline, errors);
}