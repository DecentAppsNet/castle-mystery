/* This file parses and schedules character facing-direction activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVariableOptions, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { FacingDirection } from "@/game/types/Character";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { findCharacterFacingDirection, findItemFacingDirection } from "./util/facingUtil";

function _findFacingDirection(characterId:string, target:any, toCharacterId:any, toItemId:any, editableTimeline:EditableTimeline, time:number):FacingDirection {
  if (target === 'left' || target === 'right') return target;
  if (typeof toCharacterId === 'string') return findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, time);
  assert(typeof toItemId === 'string');
  return findItemFacingDirection(characterId, toItemId, editableTimeline, time);
}

/** Creates the accepted syntax for facing activities. */
export function createFacesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const faces = makeVerb('faces');
  const direction = makeVariableOptions('target', [
    makeLiteral('left'),
    makeLiteral('right'),
    makeIdentifier('toCharacterId', 'CharacterId'),
    makeIdentifier('toItemId', 'ItemId')
  ]);
  const rootParseStep = makeSequence([characterId, faces, direction]);
  return createParseFormat(rootParseStep);
}

/** Schedules a character's facing direction into an editable timeline. */
export function scheduleFacesActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId, target, toCharacterId, toItemId } = activity.parts;
  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);
  activity.busyCharacterIds = [characterId];

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);

  const facingDirection = _findFacingDirection(characterId, target, toCharacterId, toItemId, editableTimeline, activity.startTime);
  addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);

  activity.endTime = activity.startTime;
  
  return true;
}