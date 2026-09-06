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
import { createSkinId } from "@/levelLoading/generalLoading";

export const NO_SKIN_DEFAULT = 'default';

type PartsShape = {
  characterId:string,
  skinName?:string,
  isDefault?:string
};

function _getSkinIdKeyChangeValue(characterId:string, skinName?:string, isDefault?:string):string|null {
  if (skinName) return createSkinId(characterId, skinName);
  assertNonNullable(isDefault); // Either skin name or default will be specified.
  return null;
}

/** Creates the accepted syntax for appearance activities. */
export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true); // Has no meaning, just supporting natural grammar in authoring for "Sam appears drunk" vs "Sam appears as mailman".
  const skinName = makeIdentifier('skinName', 'SkinName');
  const isDefault = makeVariableLiteral('isDefault', NO_SKIN_DEFAULT);
  const becomeOptions = makeOptions([ skinName, isDefault ]);
  const rootParseStep = makeSequence([characterId, appears, as, becomeOptions]);
  return createParseFormat(rootParseStep);
}

/** Schedules an appearance activity into an editable timeline. */
export function scheduleAppearsActivity(level:Level, _waypointContext:WaypointGenerationContext, 
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const { characterId, skinName, isDefault } = activity.parts as PartsShape;

  const skinIdKeyChangeValue = _getSkinIdKeyChangeValue(characterId, skinName, isDefault);
  if (skinIdKeyChangeValue) {
    const character = level.characters.find(c => c.id === characterId);
    assertNonNullable(character);
    if (!character.skins.some(s => s.id === skinIdKeyChangeValue)) {
      assertNonNullable(skinIdKeyChangeValue);
      errors.addAtLine(`${characterId} can't appear as "${skinName}" because no skin with that name is defined for this character.`, activity.lineI);
      return false;
    }
  }

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  assertNonNullable(activity.startTime);
  addCharacterKeyChanges({ skinId:skinIdKeyChangeValue }, characterI, activity.startTime, editableTimeline);

  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  activity.endTime = activity.startTime;
  return true;
}