import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVariableOptions, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable, botch } from "decent-portal";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { FacingDirection } from "@/game/types/Character";
import { createKeyframeAtTime } from "@/game/timeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Position from "@/game/types/Position";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

function _findCharacterFacingDirection(characterId:string, toCharacterId:string, editableTimeline:EditableTimeline, time:number):FacingDirection {
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, time);
  const fromCharacterI = editableTimeline.characterIdToI[characterId];
  const toCharacterI = editableTimeline.characterIdToI[toCharacterId];
  const fromPosition = keyframe.characters[fromCharacterI].position;
  const toPosition = keyframe.characters[toCharacterI].position;
  return toPosition.x > fromPosition.x ? 'right' : 'left';
}

function _findItemPositionInKeyframe(keyframe:TimelineKeyframe, itemId:string):Position {
  for(let roomI = 0; roomI < keyframe.rooms.length; ++roomI) {
    const room = keyframe.rooms[roomI];
    const foundItem = room.items.find(i => i.id === itemId);
    if (foundItem) return foundItem.position;
  }
  for(let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
    const character = keyframe.characters[characterI];
    if (character.leftHandItem?.id === itemId || character.rightHandItem?.id === itemId) return character.position;
    const foundItem = character.items.find(i => i.id === itemId);
    if (foundItem) return character.position;
  }

  botch(); // Because itemId was earlier checked against allowed IDs when parsing against "faces" parse format, it should be impossible for the item to not be found in a keyframe.
}

function _findItemFacingDirection(characterId:string, toItemId:string,  editableTimeline:EditableTimeline, time:number):FacingDirection {
  const keyframe = createKeyframeAtTime(editableTimeline.keyframes, time);
  const fromCharacterI = editableTimeline.characterIdToI[characterId];
  const fromPosition = keyframe.characters[fromCharacterI].position;
  const toPosition = _findItemPositionInKeyframe(keyframe, toItemId);
  return toPosition.x > fromPosition.x ? 'right' : 'left';
}

function _findFacingDirection(characterId:string, target:any, toCharacterId:any, toItemId:any, editableTimeline:EditableTimeline, time:number):FacingDirection {
  if (target === 'left' || target === 'right') return target;
  if (typeof toCharacterId === 'string') return _findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, time);
  assert(typeof toItemId === 'string');
  return _findItemFacingDirection(characterId, toItemId, editableTimeline, time);
}

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

export function scheduleFacesActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId, target, toCharacterId, toItemId } = activity.parts;
  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);

  const facingDirection = _findFacingDirection(characterId, target, toCharacterId, toItemId, editableTimeline, activity.startTime);
  
  addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);

  activity.endTime = activity.startTime;
  
  return true;
}