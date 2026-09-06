/* This file parses and schedules character appearance activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeOptions, makeSequence, makeVariableLiteral, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { skinIdToName } from "@/levelLoading/generalLoading";

export const NO_SKIN_DEFAULT = 'default';

type PartsShape = {
  characterId:string,
  skinId?:string,
  isDefault?:string
};

function _getSkinIdKeyChangeValue(skinId?:string, isDefault?:string):string|null {
  if (skinId) return skinId;
  assertNonNullable(isDefault);
  return null;
}

/** Creates the accepted syntax for appearance activities. */
export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true); // Has no meaning, just supporting natural grammar in authoring for "Sam appears drunk" vs "Sam appears as mailman".
  const skinId = makeIdentifier('skinId', 'SkinId');
  const isDefault = makeVariableLiteral('isDefault', NO_SKIN_DEFAULT);
  const becomeOptions = makeOptions([ skinId, isDefault ]);
  const rootParseStep = makeSequence([characterId, appears, as, becomeOptions]);
  return createParseFormat(rootParseStep);
}

/** Schedules an appearance activity into an editable timeline. */
export function scheduleAppearsActivity(level:Level, _waypointContext:WaypointGenerationContext, 
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const { characterId, skinId, isDefault } = activity.parts as PartsShape;

  const skinIdKeyChangeValue = _getSkinIdKeyChangeValue(skinId, isDefault);
  if (!skinIdKeyChangeValue) return false;
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character);
  if (!character.skins.some(s => s.id === skinId)) {
    assertNonNullable(skinId);
    const skinName = skinIdToName(skinId);
    errors.addAtLine(`${characterId} can't appear as "${skinName}" because no skin with that name is defined for this character.`, activity.lineI);
    return false;
  }

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(character);
  assertNonNullable(activity.startTime);
  addCharacterKeyChanges({ skinId:skinIdKeyChangeValue }, characterI, activity.startTime, editableTimeline);

  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  activity.endTime = activity.startTime;
  return true;
}