/* This file parses and schedules character reclining activities.
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

type LaysParts = { characterId:string, targetItemId?:string };

/** Creates the accepted syntax for reclining activities. */
export function createLaysParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('lays'),
    makeSequence([
      makeLiteralOptions(['on', 'above', 'in', 'over', 'at']),
      makeIdentifier('targetItemId', 'ItemId')
    ], true)
  ]);
  return createParseFormat(rootParseStep);
}

/** Schedules a reclining posture into an editable timeline. */
export function scheduleLaysActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  const { characterId, targetItemId } = activity.parts as LaysParts;
  assert(typeof characterId === 'string');
  assert(targetItemId === undefined || typeof targetItemId === 'string');
  return schedulePostureActivity('laying', level, waypointContext, activity, editableTimeline, errors);
}