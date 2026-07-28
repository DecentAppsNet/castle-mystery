/* This module groups itinerary event creation, indexing, duration, and pose-reconstruction helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import RoomEntryEvent from "./types/itineraryEvents/RoomEntryEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import EmitEvent from "./types/itineraryEvents/EmitEvent";
import ThoughtEvent from "./types/itineraryEvents/ThoughtEvent";
import CharacterEncounterEvent from "./types/itineraryEvents/CharacterEncounterEvent";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import BecomesCharacterEvent from "./types/itineraryEvents/BecomesCharacterEvent";
import BecomesItemEvent from "./types/itineraryEvents/BecomesItemEvent";
import LockEvent from "./types/itineraryEvents/LockEvent";
import UnlockEvent from "./types/itineraryEvents/UnlockEvent";
import VisibilityEvent from "./types/itineraryEvents/VisibilityEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import ItemHoldLocation from "./types/ItemHoldLocation";
import type { BodyOrientation, FacingDirection } from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { roomWidthToColumnCount } from "./roomGridUtil";
import { ROOM_BACK_Z } from "./roomSpaceConstants";
import { FLOOR_WAYPOINT_Y_OFFSET } from "./waypointUtil";
import ItineraryIndex from "./types/ItineraryIndex";
import { ITEM_EFFECT_DURATION } from "./effects/dropItemUtil";
import FaceEvent from "./types/itineraryEvents/FaceEvent";
import BodyOrientationEvent from "./types/itineraryEvents/BodyOrientationEvent";
import Itinerary from "./types/Itinerary";
import CharacterPose, { createDefaultCharacterPose, duplicateCharacterPose } from "./types/CharacterPose";
import InitialPoseEvent from "./types/itineraryEvents/InitialPoseEvent";

const WALK_MSECS_PER_PIXEL = 60;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;
const WAYPOINT_DEPTH_ROW_COUNT = 3;

function _calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

function _findInitialPoseEventCharacterPose(event:InitialPoseEvent, characterId:string):CharacterPose {
  if (event.firstCharacterId === characterId) return duplicateCharacterPose(event.firstCharacterPose);
  if (event.secondCharacterId === characterId && event.secondCharacterPose) return duplicateCharacterPose(event.secondCharacterPose);
  return duplicateCharacterPose(event.firstCharacterPose);
}

function _findInitialPoseEventPosition(event:InitialPoseEvent, characterId:string|null):Position {
  if (characterId) return duplicatePosition(_findInitialPoseEventCharacterPose(event, characterId).position);
  assert(event.secondCharacterId === null, 'missing character ID for paired initial-pose event');
  return duplicatePosition(event.firstCharacterPose.position);
}

function _calcWalkDuration(room:Room, fromPosition:Position, toPosition:Position):number {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const isFloorMove = Math.abs(fromPosition.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET
    && Math.abs(toPosition.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET;
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const isDepthOnlyMove = fromPosition.x === toPosition.x
    && fromPosition.y === toPosition.y
    && fromPosition.z !== toPosition.z;
  if (isDepthOnlyMove) return Math.max(1, Math.floor(columnWidth * WALK_MSECS_PER_PIXEL * 0.5));
  const depthDistance = isFloorMove ? 0 : (toPosition.z - fromPosition.z) * WAYPOINT_DEPTH_ROW_COUNT * columnWidth;
  const distance = Math.hypot(toPosition.x - fromPosition.x, toPosition.y - fromPosition.y, depthDistance);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _createPoseFromCharacter(character:Character):CharacterPose {
  return {
    bodyOrientation:character.bodyOrientation,
    facingDirection:character.facingDirection,
    position:character.position,
    speech:null,
    thought:null
  }
}

export function createWalkEvent(_room:Room, startTime:number, fromX:number, fromY:number, toX:number, toY:number,
  fromWaypointPosition?:Position, toWaypointPosition?:Position):WalkEvent|null {
  const initialFromPosition = fromWaypointPosition ? duplicatePosition(fromWaypointPosition) : { x:fromX, y:fromY, z:ROOM_BACK_Z };
  const finalToPosition = toWaypointPosition ? duplicatePosition(toWaypointPosition) : { x:toX, y:toY, z:ROOM_BACK_Z };
  const duration = _calcWalkDuration(_room, initialFromPosition, finalToPosition);
  if (duration <= 0) return null;
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:initialFromPosition,
    toPosition:finalToPosition,
    fromWaypointPosition:fromWaypointPosition ? duplicatePosition(fromWaypointPosition) : undefined,
    toWaypointPosition:toWaypointPosition ? duplicatePosition(toWaypointPosition) : undefined,
    duration
  };
}

export function createSpeechEvent(startTime:number, speech:string):SpeechEvent {
  return {
    type:ItineraryEventType.SPEECH,
    startTime,
    speech,
    duration:_calcSpeechDuration(speech)
  };
}

export function createEmitEvent(startTime:number, itemId:string|null, emitText:string):EmitEvent {
  return {
    type:ItineraryEventType.EMIT,
    startTime,
    itemId,
    emitText,
    duration:_calcSpeechDuration(emitText)
  };
}

export function createFaceEvent(startTime:number, facingDirection:FacingDirection):FaceEvent {
  return {
    type:ItineraryEventType.FACE,
    startTime,
    duration:0,
    facingDirection
  };
}

export function createBodyOrientationEvent(startTime:number, bodyOrientation:BodyOrientation):BodyOrientationEvent {
  return {
    type:ItineraryEventType.BODY_ORIENTATION,
    startTime,
    duration:0,
    bodyOrientation
  };
}

export function createThoughtEvent(startTime:number, thought:string):ThoughtEvent {
  return {
    type:ItineraryEventType.THOUGHT,
    startTime,
    thought,
    duration:_calcSpeechDuration(thought)
  };
}

export function createCharacterEncounterEvent(startTime:number, encounteredCharacterIds:string[]):CharacterEncounterEvent {
  return {
    type:ItineraryEventType.CHARACTER_ENCOUNTER,
    startTime,
    duration:0,
    encounteredCharacterIds:[...encounteredCharacterIds]
  };
}

export function createTakeItemEvent(startTime:number, itemId:string, destination:ItemHoldLocation):TakeItemEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, duration:ITEM_EFFECT_DURATION, itemId, destination };
}

export function createDropItemEvent(startTime:number, itemId:string, position:Position, drawOffset:Position):DropItemEvent {
  return {
    type:ItineraryEventType.DROP_ITEM,
    startTime,
    duration:ITEM_EFFECT_DURATION,
    itemId,
    position:duplicatePosition(position),
    drawOffset:duplicatePosition(drawOffset)
  };
}

export function createGiveItemEvent(startTime:number, itemId:string, recipientCharacterId:string):GiveItemEvent {
  return { type:ItineraryEventType.GIVE_ITEM, startTime, duration:0, itemId, recipientCharacterId };
}

export function createBecomesCharacterEvent(startTime:number, sourceCharacterId:string, targetCharacterId:string):BecomesCharacterEvent {
  return { type:ItineraryEventType.BECOMES_CHARACTER, startTime, duration:0, sourceCharacterId, targetCharacterId };
}

export function createBecomesItemEvent(startTime:number, sourceItemId:string, targetItemId:string):BecomesItemEvent {
  return { type:ItineraryEventType.BECOMES_ITEM, startTime, duration:0, sourceItemId, targetItemId };
}

export function createLockEvent(startTime:number, roomExitId:string):LockEvent {
  return { type:ItineraryEventType.LOCK, startTime, duration:0, roomExitId };
}

export function createUnlockEvent(startTime:number, roomExitId:string):UnlockEvent {
  return { type:ItineraryEventType.UNLOCK, startTime, duration:0, roomExitId };
}

export function createShowEvent(startTime:number, targetId:string):VisibilityEvent {
  return { type:ItineraryEventType.SHOW, startTime, duration:0, targetId };
}

export function createHideEvent(startTime:number, targetId:string):VisibilityEvent {
  return { type:ItineraryEventType.HIDE, startTime, duration:0, targetId };
}

export function createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, duration:0, roomId };
}

export function createInitialPoseEvent(startTime:number, firstCharacterId:string, firstCharacterPose:CharacterPose,
  secondCharacterId:string|null, secondCharacterPose:CharacterPose|null):InitialPoseEvent {
  return {
    type:ItineraryEventType.INITIAL_POSE,
    startTime,
    duration:0,
    firstCharacterId,
    firstCharacterPose:duplicateCharacterPose(firstCharacterPose),
    secondCharacterId,
    secondCharacterPose:secondCharacterPose ? duplicateCharacterPose(secondCharacterPose) : null
  };
}

export function createInitialPoseEventFromUnpairedCharacter(character:Character, startTime:number = 0):InitialPoseEvent {
  assert(character.pairedItinerary === null, 'The character you passed is paired, which is unsupported');
  let firstCharacterPose = _createPoseFromCharacter(character);
  return createInitialPoseEvent(startTime, character.id, firstCharacterPose, null, null);
}

function _doesItineraryStartWithCharacter(initialPoseEvent:InitialPoseEvent, characterId:string):boolean {
  return initialPoseEvent.firstCharacterId === characterId;
}

const DEFAULT_CHARACTER_POSE:CharacterPose = createDefaultCharacterPose();

function _getPosesFromInitialPoseEvent(event:InitialPoseEvent, characterId:string):{characterPose:CharacterPose, pairedCharacterPose:CharacterPose} {
  assert(characterId === event.firstCharacterId || characterId == event.secondCharacterId, `Initial pose event doesn't seem to be for "${characterId}" character.`);
    
  const firstCharacterPose = duplicateCharacterPose(event.firstCharacterPose);
  const secondCharacterPose = duplicateCharacterPose(event.secondCharacterPose ?? DEFAULT_CHARACTER_POSE); // To avoid a lot of null checks in calling code, use a non-null empty pose if second pose is null.

  return (characterId === event.firstCharacterId) 
    ? { characterPose:firstCharacterPose, pairedCharacterPose:secondCharacterPose }
    : { characterPose:secondCharacterPose, pairedCharacterPose:firstCharacterPose }
}

function _findItineraryPose(characterId:string, itinerary:Itinerary, time:number):CharacterPose {
  assert(itinerary.length > 0, 'all characters must have at least one itinerary event');
  assert(itinerary[0].type === 'InitialPose', 'First event of every itinerary must be InitialPose.');
  
  const initialPoseEvent = itinerary[0] as InitialPoseEvent;
  let {characterPose, pairedCharacterPose} = _getPosesFromInitialPoseEvent(initialPoseEvent, characterId);

  let isPairedCharacter = !_doesItineraryStartWithCharacter(initialPoseEvent, characterId);

  for (const event of itinerary) {
    if (event.startTime > time) break;

    const pose = isPairedCharacter ? pairedCharacterPose : characterPose;
    switch (event.type) {
      case ItineraryEventType.WALK: {
        const walkEvent = event as WalkEvent;
        if (walkEvent.toPosition.x > walkEvent.fromPosition.x) pose.facingDirection = 'right';
        else if (walkEvent.toPosition.x < walkEvent.fromPosition.x) pose.facingDirection = 'left';
        pose.bodyOrientation = 'standing';

        const endTime = walkEvent.startTime + walkEvent.duration;
        pose.position = time < endTime
          ? interpolatePosition(walkEvent.fromPosition, walkEvent.toPosition, clamp((time - walkEvent.startTime) / walkEvent.duration, 0, 1))
          : duplicatePosition(walkEvent.toPosition);
        break;
      }
      case ItineraryEventType.FACE:
        pose.facingDirection = (event as FaceEvent).facingDirection;
        break;
      case ItineraryEventType.BODY_ORIENTATION:
        pose.bodyOrientation = (event as BodyOrientationEvent).bodyOrientation;
        break;
      case ItineraryEventType.SPEECH: {
        const speechEvent = event as SpeechEvent;
        pose.speech = time < speechEvent.startTime + speechEvent.duration ? speechEvent.speech : null;
        break;
      }
      case ItineraryEventType.THOUGHT: {
        const thoughtEvent = event as ThoughtEvent;
        pose.thought = time < thoughtEvent.startTime + thoughtEvent.duration ? thoughtEvent.thought : null;
        break;
      }
      case ItineraryEventType.BECOMES_CHARACTER: {
        const becomesEvent = event as BecomesCharacterEvent;
        isPairedCharacter = becomesEvent.targetCharacterId !== characterId;
        if (isPairedCharacter) {
          pairedCharacterPose = {...characterPose};
        } else {
          characterPose = {...pairedCharacterPose};
        }
        break;
      }

      case ItineraryEventType.EMIT:
      case ItineraryEventType.CHARACTER_ENCOUNTER:
      case ItineraryEventType.TAKE_ITEM:
      case ItineraryEventType.DROP_ITEM:
      case ItineraryEventType.GIVE_ITEM:
      case ItineraryEventType.BECOMES_ITEM:
      case ItineraryEventType.SHOW:
      case ItineraryEventType.HIDE:
      case ItineraryEventType.LOCK:
      case ItineraryEventType.UNLOCK:
      case ItineraryEventType.ROOM_ENTRY:
      case ItineraryEventType.INITIAL_POSE:
        break;
      default:
        assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
    }
  }

  return characterPose;
}

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position, characterId:string|null):Position {
  switch(event.type) {
    case ItineraryEventType.INITIAL_POSE:
      return _findInitialPoseEventPosition(event as InitialPoseEvent, characterId);
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.DIE:
    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.FACE:
    case ItineraryEventType.BODY_ORIENTATION:
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.EMIT:
    case ItineraryEventType.THOUGHT:
    case ItineraryEventType.CHARACTER_ENCOUNTER:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
    case ItineraryEventType.BECOMES_CHARACTER:
    case ItineraryEventType.BECOMES_ITEM:
    case ItineraryEventType.SHOW:
    case ItineraryEventType.HIDE:
    case ItineraryEventType.LOCK:
    case ItineraryEventType.UNLOCK:
      return duplicatePosition(eventStartPosition);
    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

export function interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  if (interpolateAmount <= 0) return {...fromPosition};
  if (interpolateAmount >= 1) return {...toPosition};
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const dz = toPosition.z - fromPosition.z;
  return {
    x:fromPosition.x + (interpolateAmount * dx),
    y:fromPosition.y + (interpolateAmount * dy),
    z:fromPosition.z + (interpolateAmount * dz)
  };
}

export function findCharacterPoseWithoutPairHistory(character:Character, time:number):CharacterPose {
  return _findItineraryPose(character.id, character.itinerary, time);
}

export function findCharacterPose(character:Character, time:number):CharacterPose {
  const itinerary = character.pairedItinerary ?? character.itinerary;
  return _findItineraryPose(character.id, itinerary, time);
}

function _areItineraryEventsInOrder(events:ReadonlyArray<ItineraryEvent>):boolean {
  for (let i = 1; i < events.length; ++i) {
    if (events[i - 1].startTime > events[i].startTime) return false;
  }
  return true;
}

export function createItineraryIndex(events:ItineraryEvent[], initialPosition?:Position, characterId:string|null = null):ItineraryIndex {
  assert(_areItineraryEventsInOrder(events), 'itinerary events must be ordered by startTime');
  if (!events.length) {
    return { eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[0] };
  }
  const eventStartPositions:Position[] = [];
  const firstWalkEvent = events.find(event => event.type === ItineraryEventType.WALK) as WalkEvent|undefined;
  let currentPosition:Position|null = initialPosition ? duplicatePosition(initialPosition) : duplicatePosition(firstWalkEvent?.fromPosition || { x:0, y:0, z:ROOM_BACK_Z });
  if (!initialPosition) assertNonNullable(firstWalkEvent);

  for (let i = 0; i < events.length; ++i) {
    const event = events[i];
    assertNonNullable(event);
    assertNonNullable(currentPosition);
    eventStartPositions.push(duplicatePosition(currentPosition));
    currentPosition = _getEventEndPosition(event, currentPosition, characterId);
  }

  const roomEntryStartTimes = events
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
    .map(event => event.startTime);

  return {
    eventStartTimes:events.map(event => event.startTime),
    eventStartPositions,
    roomEntryStartTimes:roomEntryStartTimes[0] === 0 ? roomEntryStartTimes : [0, ...roomEntryStartTimes]
  };
}

function _findNextValue(values:ReadonlyArray<number>, time:number):number|null {
  for (const value of values) {
    if (value > time) return value;
  }
  return null;
}

function _findPreviousValue(values:ReadonlyArray<number>, time:number):number|null {
  for (let i = values.length - 1; i >= 0; --i) {
    if (values[i] < time) return values[i];
  }
  return null;
}

export function findNextRoomEntryTime(character:Character, time:number):number|null {
  return _findNextValue(character.itineraryIndex.roomEntryStartTimes, time);
}

export function findPreviousRoomEntryTime(character:Character, time:number):number|null {
  return _findPreviousValue(character.itineraryIndex.roomEntryStartTimes, time);
}

export function doesItineraryBeginWithInitialPoseEvent(itinerary:Itinerary):boolean {
  return itinerary.length > 0 && itinerary[0].type === 'InitialPose';
}