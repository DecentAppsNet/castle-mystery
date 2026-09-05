/* This file parses and schedules character appearance activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";

type PartsShape = {
  characterId:string,
  skinId:string
};

function _skinIdToName(skinId:string):string {
  const tokens = skinId.split('-');
  return (tokens.length < 2) ? skinId : tokens[1].trim();
}

/** Creates the accepted syntax for appearance activities. */
export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true); // Has no meaning, just supoorting natural grammar in authoring for "Sam appears drunk" vs "Sam appears as mailman".
  const skinId = makeIdentifier('skinId', 'SkinId');
  const rootParseStep = makeSequence([characterId, appears, as, skinId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an appearance activity into an editable timeline. */
export function scheduleAppearsActivity(level:Level, _waypointContext:WaypointGenerationContext, 
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const { characterId, skinId } = activity.parts as PartsShape;

  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character);
  if (!character.skins.some(s => s.id === skinId)) {
    const skinName = _skinIdToName(skinId);
    errors.addAtLine(`${characterId} can't appear as "${skinName}" because no skin with that name is defined for this character.`, activity.lineI);
    return false;
  }

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(character);
  assertNonNullable(activity.startTime);
  addCharacterKeyChanges({ skinId }, characterI, activity.startTime, editableTimeline);

  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  activity.endTime = activity.startTime;
  return true;
}