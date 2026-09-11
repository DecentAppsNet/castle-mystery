/* This module groups itinerary-marker derivation helpers for time-slider room, speech, and encounter markers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

  import { assert, assertNonNullable } from "decent-portal";

import { MSECS_IN_SECOND } from "@/common/timeUtil";
import Character from "@/game/types/Character";
import { SkinLinkages } from "@/game/types/DiscoveryState";
import Room from "@/game/types/Room";
import Timeline from "@/game/types/Timeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findRoomIdAtPosition } from "@/game/roomUtil";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import { generateRoomEntryEvents } from "./roomEntranceUtil";
import RoomEntryEvents from "./types/RoomEntryEvents";

export const SPEECH_CLUSTER_GAP_MSECS = 6 * MSECS_IN_SECOND;

type SpeechMarkerRange = {
  startTime:number,
  endTime:number
}

type EncounterMarker = {
  startTime:number,
  encounteredCharacterIds:string[]
}

type ObscuredMarkerRange = {
  startTime:number,
  endTime:number
}

export type ItineraryMarkerModel = {
  roomEntryTimes:number[],
  speechRanges:SpeechMarkerRange[],
  encounterMarkers:EncounterMarker[],
  obscuredRanges:ObscuredMarkerRange[]
}

/* TODO uncomment if needed
function _isTimeInsideRange(time:number, range:ObscuredMarkerRange):boolean {
  return time >= range.startTime && time < range.endTime;
} */

/* TODO uncomment if needed
function _subtractObscuredRangesFromSpeechRange(range:SpeechMarkerRange, obscuredRanges:ObscuredMarkerRange[]):SpeechMarkerRange[] {
  return obscuredRanges.reduce<SpeechMarkerRange[]>((remainingRanges, obscuredRange) => {
    return remainingRanges.flatMap(remainingRange => {
      if (obscuredRange.endTime <= remainingRange.startTime || obscuredRange.startTime >= remainingRange.endTime) {
        return [remainingRange];
      }

      const nextRanges:SpeechMarkerRange[] = [];
      if (obscuredRange.startTime > remainingRange.startTime) {
        nextRanges.push({ startTime:remainingRange.startTime, endTime:Math.min(obscuredRange.startTime, remainingRange.endTime) });
      }
      if (obscuredRange.endTime < remainingRange.endTime) {
        nextRanges.push({ startTime:Math.max(obscuredRange.endTime, remainingRange.startTime), endTime:remainingRange.endTime });
      }
      return nextRanges;
    });
  }, [range]).filter(remainingRange => remainingRange.endTime > remainingRange.startTime);
} */

/* TODO with timeline
function _createObscuredRanges(itinerary:Itinerary, initiallyObscuredRoomIds:ReadonlySet<string>, initialRoomId:string|null, durationMsecs:number):ObscuredMarkerRange[] {
  const roomEntryEvents = itinerary
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
    .map(event => event as RoomEntryEvent)
    .sort((event1, event2) => event1.startTime - event2.startTime);
  const obscuredRanges:ObscuredMarkerRange[] = [];
  let currentRoomId = initialRoomId;
  let obscuredStartTime = currentRoomId && initiallyObscuredRoomIds.has(currentRoomId) ? 0 : null;

  roomEntryEvents.forEach(roomEntryEvent => {
    if (obscuredStartTime !== null) {
      obscuredRanges.push({ startTime:obscuredStartTime, endTime:roomEntryEvent.startTime });
    }
    currentRoomId = roomEntryEvent.roomId;
    obscuredStartTime = initiallyObscuredRoomIds.has(currentRoomId) ? roomEntryEvent.startTime : null;
  });

  if (obscuredStartTime !== null && durationMsecs > obscuredStartTime) {
    obscuredRanges.push({ startTime:obscuredStartTime, endTime:durationMsecs });
  }

  return obscuredRanges.filter(range => range.endTime > range.startTime);
} */

/* TODO with timeline
function _createSpeechRanges(itinerary:Itinerary):SpeechMarkerRange[] {
  return itinerary
    .filter(event => event.type === ItineraryEventType.SPEECH || event.type === ItineraryEventType.THOUGHT)
    .map(event => {
      return {
        startTime:event.startTime,
        endTime:event.startTime + event.duration
      };
    })
    .sort((range1, range2) => range1.startTime - range2.startTime);
} */

/* TODO uncomment if needed
function _hasObscuredRangeBetween(range1:SpeechMarkerRange, range2:SpeechMarkerRange, obscuredRanges:ObscuredMarkerRange[]):boolean {
  return obscuredRanges.some(obscuredRange => obscuredRange.startTime >= range1.endTime && obscuredRange.endTime <= range2.startTime);
} */

/* TODO uncomment if needed
function _mergeSpeechRanges(speechRanges:SpeechMarkerRange[], obscuredRanges:ObscuredMarkerRange[] = []):SpeechMarkerRange[] {
  const sortedSpeechRanges = [...speechRanges].sort((range1, range2) => range1.startTime - range2.startTime);

  return sortedSpeechRanges.reduce<SpeechMarkerRange[]>((mergedRanges, nextRange) => {
    const previousRange = mergedRanges[mergedRanges.length - 1] || null;
    if (!previousRange) {
      mergedRanges.push(nextRange);
      return mergedRanges;
    }
    if (_hasObscuredRangeBetween(previousRange, nextRange, obscuredRanges)) {
      mergedRanges.push(nextRange);
      return mergedRanges;
    }
    if (nextRange.startTime - previousRange.endTime <= SPEECH_CLUSTER_GAP_MSECS) {
      previousRange.endTime = Math.max(previousRange.endTime, nextRange.endTime);
      return mergedRanges;
    }
    mergedRanges.push(nextRange);
    return mergedRanges;
  }, []);
} */

function _isKeyframeObscured(characterPosition:Position, characterSkinId:string, rooms:Room[], revealedSkinIds:Set<string>, obscuredRoomIds:Set<string>):boolean {
  if (!revealedSkinIds.has(characterSkinId)) return true;
  const { x, y } = characterPosition;
  const roomId = findRoomIdAtPosition(rooms, x, y);
  assertNonNullable(roomId);
  return obscuredRoomIds.has(roomId);
}

function _findObscuredRangeStartingAtKeyframe(keyframes:TimelineKeyframe[], startKeyframeI:number, activeCharacterI:number, rooms:Room[],
    revealedSkinIds:Set<string>, obscuredRoomIds:Set<string>, roomEntryEvents:RoomEntryEvents):{obscuredRange:ObscuredMarkerRange, lastObscuredKeyframeI:number}|null {
  const obscuredRange = { startTime:keyframes[startKeyframeI].time, endTime:-1 };
  let lastObscuredKeyframeI:number = -1;
  let firstUnobscuredKeyframeI = keyframes.length;

  // Sentinel values - guaranteed not to match.
  let lastSkinId = ''; 
  let lastPosition = {x:-1, y:-1, z:-1};

  for(let keyframeI = startKeyframeI; keyframeI < keyframes.length; ++keyframeI) {
    const characterKeyframe = keyframes[keyframeI].characters[activeCharacterI];
    assertNonNullable(characterKeyframe);
    const { skinId, position } = characterKeyframe;
    if (skinId !== lastSkinId || !arePositionsEqual(position, lastPosition)) {
      const isKeyframeObscured = _isKeyframeObscured(position, skinId, rooms, revealedSkinIds, obscuredRoomIds);
      if (!isKeyframeObscured) {
        firstUnobscuredKeyframeI = keyframeI;
        break;
      }
      lastPosition = position;
      lastSkinId = skinId;
    }
    obscuredRange.endTime = keyframes[keyframeI].time;
    lastObscuredKeyframeI = keyframeI;
  }

  if (obscuredRange.endTime === -1) return null;

  const priorRoomEntry = roomEntryEvents.findLast(event => event.time <= obscuredRange.startTime);
  if (priorRoomEntry && obscuredRoomIds.has(priorRoomEntry.roomId)) obscuredRange.startTime = priorRoomEntry.time;
  const nextRoomEntry = roomEntryEvents.find(event => event.time > obscuredRange.endTime);
  if (nextRoomEntry && nextRoomEntry.time <= keyframes[firstUnobscuredKeyframeI]?.time
      && !obscuredRoomIds.has(nextRoomEntry.roomId)) obscuredRange.endTime = nextRoomEntry.time;

  assert(lastObscuredKeyframeI >= startKeyframeI);
  return { obscuredRange, lastObscuredKeyframeI };
}

function _isTimeWithinObscuredRange(time:number, obscuredRanges:ObscuredMarkerRange[]):boolean {
  return obscuredRanges.some(or => or.startTime < time && or.endTime > time);
}

export function createItineraryMarkerModel(timeline:Timeline|null, activeCharacterId:string, activeSkinIdAtSelection:string, rooms:Room[] = [], 
    _characters:Pick<Character, 'id' | 'description'>[] = [], 
    revealedSkinLinkages:SkinLinkages, obscuredRoomIds:Set<string>):ItineraryMarkerModel {
  
  const markers:ItineraryMarkerModel = {
    roomEntryTimes:[],
    speechRanges:[],
    encounterMarkers:[],
    obscuredRanges:[]
  };
  if (!timeline || timeline.keyframes.length < 1) return markers;

  const roomEntryEvents:RoomEntryEvents[] = generateRoomEntryEvents(timeline.keyframes, rooms);
  
  const { keyframes } = timeline;
  const activeCharacterI  = timeline.characterIdToI[activeCharacterId];
  const characterRoomEntries:RoomEntryEvents = roomEntryEvents[activeCharacterI];
  const revealedSkinIds = revealedSkinLinkages[activeSkinIdAtSelection]; // All of the active character skins the player is allowed to see.
  assertNonNullable(activeCharacterI);
  assertNonNullable(revealedSkinIds);
  for(let keyframeI = 0; keyframeI < keyframes.length; ++keyframeI) {

    // Identify an obscured range at current keyframe if it is there. And skip over it.
    const obscuredRangeResult = _findObscuredRangeStartingAtKeyframe(keyframes, keyframeI, activeCharacterI, rooms, 
        revealedSkinIds, obscuredRoomIds, characterRoomEntries); // There is an unneeded extra call to this function after a skip. Optimize if needed.
    if (obscuredRangeResult) {
      markers.obscuredRanges.push(obscuredRangeResult.obscuredRange);
      keyframeI = obscuredRangeResult.lastObscuredKeyframeI;
      continue; // Skip past keyframes inside obscured range so their events aren't represented in markers.
    }

    // TODO - add the other kinds of markers.
  }

  markers.roomEntryTimes = characterRoomEntries
    .filter(re => !_isTimeWithinObscuredRange(re.time, markers.obscuredRanges))
    .map(re => re.time);

  return markers;

  /* TODO with timeline
  const interactiveCharacterIds = new Set(characters.filter(isCharacterInteractive).map(character => character.id));
  const obscuredRanges = _createObscuredRanges(itinerary, rooms, initialRoomId, durationMsecs);
  const visibleSpeechRanges = _mergeSpeechRanges(_createSpeechRanges(itinerary)
    .flatMap(range => _subtractObscuredRangesFromSpeechRange(range, obscuredRanges)), obscuredRanges);
  const visibleEncounterMarkers = itinerary
    .filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER)
    .map(event => {
      const encounterEvent = event as CharacterEncounterEvent;
      return {
        startTime:encounterEvent.startTime,
        encounteredCharacterIds:encounterEvent.encounteredCharacterIds.filter(characterId => interactiveCharacterIds.has(characterId))
      };
    })
    .filter(marker => marker.encounteredCharacterIds.length > 0)
    .filter(marker => !obscuredRanges.some(range => _isTimeInsideRange(marker.startTime, range)));

  return {
    roomEntryTimes:itinerary
      .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
      .map(event => event.startTime),
    speechRanges:visibleSpeechRanges,
    encounterMarkers:visibleEncounterMarkers,
    obscuredRanges
  }; */
}
