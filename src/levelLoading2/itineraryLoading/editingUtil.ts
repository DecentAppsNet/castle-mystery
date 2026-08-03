import { assert, assertNonNullable } from "decent-portal";
import ItineraryKeyframe, { duplicateItineraryKeyframe } from "./types/ItineraryKeyframe";
import EditableItineraryKeyframe from "./types/EditableItineraryKeyframe";
import CharacterKeyframe, { CHARACTER_KEYFRAME_KEYS } from "./types/CharacterKeyframe";
import { findInterpolatedCharacterPosition } from "./interpolationUtil";
import RoomKeyframe, { ROOM_KEYFRAME_KEYS } from "./types/RoomKeyframe";
import Character from "@/game/types/Character";
import Room from "@/game/types/Room";
import Item, { duplicateItem } from "@/game/types/Item";
import { duplicatePosition } from "@/game/types/Position";
import EditableItinerary, { createDefaultEditableItinerary } from "./types/EditableItinerary";
import Activity from "../activityLoading/types/Activity";
import Level from "@/game/types/Level";
import ErrorCollector from "../errorCollection/ErrorCollector";
import { scheduleAtActivity } from "../activityLoading/activityHandlers/atHandler";
import Itinerary from "./types/Itinerary";
import { doesActivityUseEndTimestamp } from "../activityLoading/parseUtil";
import { scheduleTakesActivity } from "../activityLoading/activityHandlers/takesHandler";
import { scheduleDropsActivity } from "../activityLoading/activityHandlers/dropsHandler";
import { scheduleAppearsActivity } from "../activityLoading/activityHandlers/appearsHandler";
import { scheduleBecomesActivity } from "../activityLoading/activityHandlers/becomesHandler";
import { scheduleEmitsActivity } from "../activityLoading/activityHandlers/emitsHandler";
import { scheduleFacesActivity } from "../activityLoading/activityHandlers/facesHandler";
import { scheduleGivesActivity } from "../activityLoading/activityHandlers/givesHandler";
import { scheduleHideActivity } from "../activityLoading/activityHandlers/hideHandler";
import { scheduleInterruptsActivity } from "../activityLoading/activityHandlers/interruptsHandler";
import { scheduleKneelsActivity } from "../activityLoading/activityHandlers/kneelsHandler";
import { scheduleLaysActivity } from "../activityLoading/activityHandlers/laysHandler";
import { scheduleLocksActivity } from "../activityLoading/activityHandlers/locksHandler";
import { scheduleSaysActivity } from "../activityLoading/activityHandlers/saysHandler";
import { scheduleShowActivity } from "../activityLoading/activityHandlers/showHandler";
import { scheduleSitsActivity } from "../activityLoading/activityHandlers/sitsHandler";
import { scheduleStandsActivity } from "../activityLoading/activityHandlers/standsHandler";
import { scheduleUnlocksActivity } from "../activityLoading/activityHandlers/unlocksHandler";
import { scheduleWaitsActivity } from "../activityLoading/activityHandlers/waitsHandler";

function _findInsertAfterI(time:number, keyframes:ItineraryKeyframe[]):number {
  assert(keyframes.length > 0);
  assert(keyframes[0].time <= time, 'Existing first keyframe expected to be the earliest.');
  for(let i = 0; i < keyframes.length; ++i) {
    if (keyframes[i].time > time) return i - 1;
  }
  return keyframes.length - 1;
}

function _findNextKeyframeWithDefinedCharacterPosition(keyframes:readonly EditableItineraryKeyframe[], 
    fromKeyframeI:number, characterI:number):EditableItineraryKeyframe|null {
  for(let keyframeI = fromKeyframeI; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];
    if (keyframe.characters[characterI].position !== undefined) return keyframe;
  } 
  return null;
}

function _generateNextKeyframe(previousKeyframe:Readonly<ItineraryKeyframe>, 
    keyframes:readonly EditableItineraryKeyframe[], keyframeI:number):ItineraryKeyframe {
  const keyframe = keyframes[keyframeI];
  const nextKeyframe = duplicateItineraryKeyframe(previousKeyframe);
  nextKeyframe.time = keyframe.time;
  for(let characterI = 0; characterI < nextKeyframe.characters.length; ++characterI) {
    const characterKeyframe:any = keyframe.characters[characterI];
    CHARACTER_KEYFRAME_KEYS.forEach(key => {
      const keyValue = characterKeyframe[key];
      if (keyValue !== undefined) {
        (nextKeyframe.characters[characterI] as any)[key] = characterKeyframe[key];
        return;
      }
      if (key !== 'position') return;

      const endPositionKeyframe = _findNextKeyframeWithDefinedCharacterPosition(keyframes, keyframeI+1, characterI);
      if (!endPositionKeyframe) return; // No movement between positions for this character.
      const interpolatedPosition = findInterpolatedCharacterPosition(previousKeyframe, 
        endPositionKeyframe, keyframe.time, characterI);
      (nextKeyframe.characters[characterI] as any)[key] = interpolatedPosition;
    });
  }
  for(let roomI = 0; roomI < nextKeyframe.rooms.length; ++roomI) {
    const roomKeyframe:any = keyframe.rooms[roomI];
    ROOM_KEYFRAME_KEYS.forEach(key => {
      const keyValue = roomKeyframe[key];
      if (keyValue === undefined) return;
      (nextKeyframe.rooms[roomI] as any)[key] = roomKeyframe[key];
    });
  }
  return nextKeyframe;
}

// If this gets to be a bottleneck, you can use an algoritm like:
// 1. Receive a fromI param that is set to the earliest known change in frame keying.
// 2. Update existing frames from fromI until a frame is unchanged from its original value. (Signals end of affected keyframes).
function generateKeyframes(editableKeyframes:readonly EditableItineraryKeyframe[]):ItineraryKeyframe[] {
  // Replay every editable (partial) keyframe to generate resolved keyframes.
  assert(editableKeyframes.length >= 1);
  const keyframes:ItineraryKeyframe[] = [];
  let currentKeyframe:ItineraryKeyframe = editableKeyframes[0] as ItineraryKeyframe; // First frame always guaranteed to be resolved.
  for(let i = 0; i < editableKeyframes.length; ++i) {
    if (i > 0) currentKeyframe = _generateNextKeyframe(currentKeyframe, editableKeyframes, i);
    keyframes.push(currentKeyframe);
  }
  return keyframes;
}

function _createCharacterIdToI(characters:readonly Character[]):{[characterId:string]:number} {
  const characterIdToI:{[characterId:string]:number} = {};
  characters.forEach((character, characterI) => {
    characterIdToI[character.id] = characterI;
  });
  return characterIdToI;
}

function _createRoomIdToI(rooms:readonly Room[]):{[roomId:string]:number} {
  const roomIdToI:{[roomId:string]:number} = {};
  rooms.forEach((room, roomI) => {
    roomIdToI[room.id] = roomI;
  });
  return roomIdToI;
}

function _duplicateOptionalItem(item:Readonly<Item>|null):Item|null {
  return item === null ? null : duplicateItem(item);
}

function _createFirstCharacterKeyframe(character:Readonly<Character>):CharacterKeyframe {
  const keyframe:CharacterKeyframe = {
    appearanceId: '', // TODO - add to Character
    isVisible:character.isVisible,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    items:[...character.items.map(duplicateItem)],
    leftHandItem: _duplicateOptionalItem(character.leftHandItem),
    rightHandItem: _duplicateOptionalItem(character.rightHandItem),
    position: duplicatePosition(character.position)
  };
  return keyframe;
}

function _createFirstRoomKeyframe(room:Readonly<Room>):RoomKeyframe {
  const keyframe:RoomKeyframe = {
    items:[...room.items.map(duplicateItem)]
  }
  return keyframe;
}

function _createFirstKeyframe(characters:readonly Character[], rooms:readonly Room[], time:number):ItineraryKeyframe {
  const characterKeyframes = characters.map(c => _createFirstCharacterKeyframe(c));
  const roomKeyFrames = rooms.map(r => _createFirstRoomKeyframe(r));
  return { time, characters:characterKeyframes, rooms:roomKeyFrames };
}

function _addCharacterKeyframeToItineraryKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, toKeyframe:EditableItineraryKeyframe) {
  const toCharacterKeyframe:Partial<CharacterKeyframe> = toKeyframe.characters[characterI];
  assertNonNullable(toCharacterKeyframe);
  CHARACTER_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (characterKeyframe as any)[key];
    if (keyValue !== undefined) (toCharacterKeyframe as any)[key] = keyValue;
  });
}

function _createEditableKeyframeFromCharacterKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, time:number, characterCount:number, roomCount:number):EditableItineraryKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) {
    characters[i] = (i === characterI) ? characterKeyframe : {};
  }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { rooms[i] = {}; }
  const keyframe:EditableItineraryKeyframe = { time, characters, rooms };
  return keyframe;
}

function _addRoomKeyframeToItineraryKeyframe(roomKeyframe:Readonly<Partial<RoomKeyframe>>, roomI:number, 
    toKeyframe:EditableItineraryKeyframe) {
  const toRoomKeyframe:Partial<RoomKeyframe> = toKeyframe.rooms[roomI];
  assertNonNullable(toRoomKeyframe);
  ROOM_KEYFRAME_KEYS.forEach(key => {
    const keyValue = (roomKeyframe as any)[key];
    if (keyValue !== undefined) (toRoomKeyframe as any)[key] = keyValue;
  });
}

function _createEditableKeyframeFromRoomKeyframe(roomKeyframe:Readonly<Partial<CharacterKeyframe>>, roomI:number, 
    time:number, characterCount:number, roomCount:number):EditableItineraryKeyframe {
  const characters:Partial<CharacterKeyframe>[] = [];
  for(let i = 0; i < characterCount; ++i) { characters[i] = {}; }
  const rooms:Partial<RoomKeyframe>[] = [];
  for(let i = 0; i < roomCount; ++i) { 
    rooms[i] = (i === roomI) ? roomKeyframe : {};
  }
  const keyframe:EditableItineraryKeyframe = { time, characters, rooms };
  return keyframe;
}

function _getCharacterAndRoomCount(editableItinerary:Readonly<EditableItinerary>)
    :{characterCount:number, roomCount:number} {
  const firstKeyframe = editableItinerary.keyframes[0];
  assertNonNullable(firstKeyframe);
  return { 
    characterCount:firstKeyframe.characters.length,
    roomCount:firstKeyframe.rooms.length
  };
}

function _insertEditableKeyframeAfter(array:EditableItineraryKeyframe[], insertAfterI:number, insertElement:EditableItineraryKeyframe):void {
  array.splice(insertAfterI+1, 0, insertElement);
}

function _areActivitiesWellOrdered(activities:readonly Activity[], startTime:number):boolean {
  let time = startTime;
  for(let i = 0; i < activities.length; ++i) {
    const activity = activities[i];
    if (activity.startTime !== null) {
      if (activity.startTime < time) return false;
      time = activity.startTime;
    }
  }
  return true;
}

function _findNextActivityStartTime(prevActivity:Readonly<Activity>|null):number|null {
  if (!prevActivity || !prevActivity.endTime) return null;
  return prevActivity.endTime;
}

function _resolveRelativeTimestampAsNeeded(activity:Activity) {
  if (activity.startTime !== null || doesActivityUseEndTimestamp(activity.verb)) return;
  activity.startTime = _findNextActivityStartTime(activity.prevActivity);
}

type ScheduleActivityCallback = (level:Level, activity:Activity, itinerary:EditableItinerary, errors:ErrorCollector) => boolean;
const VERB_TO_SCHEDULE_ACTIVITY_FUNC:Readonly<{[verb:string]:ScheduleActivityCallback}> = {
  '@': scheduleAtActivity,
  'appears': scheduleAppearsActivity,
  'becomes': scheduleBecomesActivity,
  'takes': scheduleTakesActivity,
  'drops': scheduleDropsActivity,
  'emits': scheduleEmitsActivity,
  'faces': scheduleFacesActivity,
  'gives': scheduleGivesActivity,
  'hide': scheduleHideActivity,
  'interrupts': scheduleInterruptsActivity,
  'kneels': scheduleKneelsActivity,
  'lays': scheduleLaysActivity,
  'locks': scheduleLocksActivity,
  'says': scheduleSaysActivity,
  'show': scheduleShowActivity,
  'sits': scheduleSitsActivity,
  'stands': scheduleStandsActivity,
  'unlocks': scheduleUnlocksActivity,
  'waits': scheduleWaitsActivity
}

function _scheduleActivity(level:Level, activity:Activity, itinerary:EditableItinerary, errors:ErrorCollector):boolean {
  const scheduleActivityFunc = VERB_TO_SCHEDULE_ACTIVITY_FUNC[activity.verb];
  assertNonNullable(scheduleActivities, `Add handler for "${activity.verb}"`);
  if (!doesActivityUseEndTimestamp(activity.verb) && activity.startTime === null) return false; // A preceding activity must be scheduled first.
  return scheduleActivityFunc(level, activity, itinerary, errors);
}

export function addKeyframe(editableKeyframe:Readonly<EditableItineraryKeyframe>, itinerary:EditableItinerary) {
  const insertAfterI = _findInsertAfterI(editableKeyframe.time, itinerary.keyframes);
  _insertEditableKeyframeAfter(itinerary.editableKeyframes, insertAfterI, editableKeyframe);
  itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
}

export function addCharacterKeyframe(characterKeyframe:Readonly<Partial<CharacterKeyframe>>, 
    characterI:number, time:number, itinerary:EditableItinerary) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(itinerary);
  const existingFrame = itinerary.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addCharacterKeyframeToItineraryKeyframe(characterKeyframe, characterI, existingFrame);
    itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromCharacterKeyframe(characterKeyframe, characterI, time, characterCount, roomCount);
    addKeyframe(keyframe, itinerary);
  }
}

export function addRoomKeyframe(roomKeyframe:Readonly<Partial<RoomKeyframe>>, roomI:number, 
    time:number, itinerary:EditableItinerary) {
  const { characterCount, roomCount } = _getCharacterAndRoomCount(itinerary);
  const existingFrame = itinerary.editableKeyframes.find(kf => kf.time === time);
  if (existingFrame) {
    _addRoomKeyframeToItineraryKeyframe(roomKeyframe, roomI, existingFrame);
    itinerary.keyframes = generateKeyframes(itinerary.editableKeyframes);
  } else {
    const keyframe = _createEditableKeyframeFromRoomKeyframe(roomKeyframe, roomI, time, characterCount, roomCount);
    addKeyframe(keyframe, itinerary);
  }
}

export function createEditableItinerary(characters:readonly Character[], rooms:readonly Room[], startTime:number):EditableItinerary {
  const itinerary = createDefaultEditableItinerary();
  itinerary.characterIdToI = _createCharacterIdToI(characters);
  itinerary.roomIdToI = _createRoomIdToI(rooms);
  const firstKeyframe = _createFirstKeyframe(characters, rooms, startTime);
  itinerary.keyframes.push(firstKeyframe);
  itinerary.editableKeyframes.push(firstKeyframe); // First keyframe always guaranteed to be fully resolved.
  return itinerary;
}

function _editableItineraryToItinerary(editableItinerary:Readonly<EditableItinerary>):Itinerary {
  const { keyframes, roomIdToI, characterIdToI } = editableItinerary;
  return { keyframes, roomIdToI, characterIdToI };
}

function _createEmptyItinerary(characters:readonly Character[], rooms:readonly Room[]):Itinerary {
  const editable = createEditableItinerary(characters, rooms, 0);
  return _editableItineraryToItinerary(editable);
}

export function scheduleActivities(level:Level, activities:Activity[], errors:ErrorCollector):Itinerary|null {
  if (!activities.length) return _createEmptyItinerary(level.characters, level.rooms);
  assert(_areActivitiesWellOrdered(activities, level.startTime));
  const itinerary:EditableItinerary = createEditableItinerary(level.characters, level.rooms, level.startTime);
  const toBeScheduled = [...activities];
  for(let attemptI = 0; attemptI < activities.length; ++attemptI) {
    const nextActivity = toBeScheduled[0];
    _resolveRelativeTimestampAsNeeded(nextActivity);
    if (_scheduleActivity(level, toBeScheduled[0], itinerary, errors)) {
      toBeScheduled.shift();
    }
  }
  return _editableItineraryToItinerary(itinerary);
}