/* This file parses and schedules item transfers between characters.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for giving activities. */
export function createGivesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const gives = makeVerb('gives');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const to = makeLiteral('to');
  const toCharacterId = makeIdentifier('toCharacterId', 'CharacterId');
  const rootParseStep = makeSequence([characterId, gives, itemId, to, toCharacterId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an item transfer between characters into an editable timeline. */
export function scheduleGivesActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  activity.endTime = activity.startTime;
  return true;
}