/* This module groups itinerary-marker derivation helpers for time-slider room, speech, and encounter markers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { SkinLinkages } from "@/game/types/DiscoveryState";
import Room from "@/game/types/Room";
import Timeline from "@/game/types/Timeline";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { findRoomIdAtPosition } from "@/game/roomUtil";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/positionUtil";
import { generateRoomEntryEvents } from "./roomEntranceUtil";
import RoomEntryEvents from "./types/RoomEntryEvents";
import { doesKeyframeHaveSpeechHeardByCharacter } from "@/levelLoading/activityLoading/activitySchedulers/util/speechUtil";
import TimeRange from "./types/TimeRange";
import { isTimeInRanges, subtractRanges } from "./timeRangeUtil";
import ItineraryMarkerModel from "./types/ItineraryMarkerModel";

const SPEECH_CLUSTER_GAP_MSECS = 6 * MSECS_IN_SECOND;

function _isKeyframeObscured(characterPosition:Position, characterSkinId:string, rooms:Room[], revealedSkinIds:Set<string>, obscuredRoomIds:Set<string>):boolean {
  if (!revealedSkinIds.has(characterSkinId)) return true;
  const { x, y } = characterPosition;
  const roomId = findRoomIdAtPosition(rooms, x, y);
  assertNonNullable(roomId);
  return obscuredRoomIds.has(roomId);
}

function _findObscuredRangeStartingAtKeyframe(keyframes:TimelineKeyframe[], startKeyframeI:number, activeCharacterI:number, rooms:Room[],
    revealedSkinIds:Set<string>, obscuredRoomIds:Set<string>, roomEntryEvents:RoomEntryEvents):{obscuredRange:TimeRange, lastObscuredKeyframeI:number}|null {
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

function _findOtherCharacterEncounterTimes(activeRoomId:string, activeCharacterI:number, roomEntryEvents:RoomEntryEvents[], 
    activeCharacterEntryTime:number, activeCharacterExitTime:number):number[] {
  const entryTimes:number[] = [];
  roomEntryEvents.forEach((characterRoomEntryEvents, characterI) => {
    if (characterI === activeCharacterI) return;

    const priorRoomEntry = characterRoomEntryEvents.findLast(event => event.time <= activeCharacterEntryTime);
    const isAlreadyInActiveRoom = priorRoomEntry?.roomId === activeRoomId
      && !characterRoomEntryEvents.some(event => event.time === activeCharacterEntryTime && event.roomId !== activeRoomId);
    if (isAlreadyInActiveRoom) entryTimes.push(activeCharacterEntryTime);

    characterRoomEntryEvents.forEach(cree => {
      if (cree.roomId !== activeRoomId || activeCharacterEntryTime >= cree.time || activeCharacterExitTime < cree.time) return;
      entryTimes.push(cree.time);
    });
  });
  return entryTimes;
}

function _generateEncounterTimes(roomEntryEvents:RoomEntryEvents[], activeCharacterI:number, 
    obscuredRanges:TimeRange[]):number[] {
  const markers:number[] = [];
  const activeCharacterRoomEntries = roomEntryEvents[activeCharacterI];
  assertNonNullable(activeCharacterRoomEntries);
  for(let roomEntryI = 0; roomEntryI < activeCharacterRoomEntries.length; ++roomEntryI) {
    const activeRoomEntry = activeCharacterRoomEntries[roomEntryI];
    const activeRoomId = activeRoomEntry.roomId;
    const activeCharacterEntryTime = activeRoomEntry.time;
    const activeCharacterExitTime = roomEntryI === activeCharacterRoomEntries.length - 1 
        ? Infinity : activeCharacterRoomEntries[roomEntryI + 1].time;
    const encounterTimes = _findOtherCharacterEncounterTimes(activeRoomId, activeCharacterI, roomEntryEvents,
        activeCharacterEntryTime, activeCharacterExitTime);
    if (!encounterTimes.length) continue;
    markers.push(...encounterTimes);
  }
  return markers.filter(time => !isTimeInRanges(time, obscuredRanges));
}

function _combineSpeechRangeWithPreviousAsNeeded(startTime:number, endTime:number, speechRanges:TimeRange[]):boolean {
  const lastSpeechRange = speechRanges[speechRanges.length-1] ?? null;
  if (!lastSpeechRange || (startTime - lastSpeechRange.endTime) >= SPEECH_CLUSTER_GAP_MSECS) return false; // No combining needed.
  lastSpeechRange.endTime = endTime; // Combine the ranges.
  return true;
}

function _generateObscuredRanges(keyframes:TimelineKeyframe[], characterI:number, rooms:Room[], obscuredRoomIds:Set<string>, 
      revealedSkinIds:Set<string>, characterRoomEntries:RoomEntryEvents):TimeRange[] {
  const obscuredRanges:TimeRange[] = [];
  for(let keyframeI = 0; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];

    // Identify an obscured range at current keyframe if it is there. And skip over it.
    const obscuredRangeResult = _findObscuredRangeStartingAtKeyframe(keyframes, keyframeI, characterI, rooms, 
        revealedSkinIds, obscuredRoomIds, characterRoomEntries); // There is an unneeded extra call to this function after a skip. Optimize if needed.
    if (obscuredRangeResult) {
      obscuredRanges.push(obscuredRangeResult.obscuredRange);
      keyframeI = obscuredRangeResult.lastObscuredKeyframeI;
      continue; // Skip past keyframes inside obscured range so their events aren't represented in markers.
    }

    // keyframeI must be outside of any obscured range at this point.
    assert(!isTimeInRanges(keyframe.time, obscuredRanges));
  }

  return obscuredRanges;
}

function _generateRoomEntryTimes(characterRoomEntries:RoomEntryEvents, obscuredRanges:TimeRange[]):number[] {
  return characterRoomEntries
    .filter(re => !isTimeInRanges(re.time, obscuredRanges))
    .map(re => re.time);
}

function _generateSpeechRanges(keyframes:TimelineKeyframe[], characterI:number, rooms:Room[], 
    obscuredRanges:TimeRange[]):TimeRange[] {

  const speechRanges:TimeRange[] = [];

  let pendingSpeechMarkerStartTime:number = -1;
  function _isSpeechMarkerOpen() { return pendingSpeechMarkerStartTime !== -1; }
  function _openSpeechMarker(time:number) { pendingSpeechMarkerStartTime = time; }
  function _closeSpeechMarker(endTime:number) {
    const startTime = pendingSpeechMarkerStartTime;
    pendingSpeechMarkerStartTime = -1;
    if (!_combineSpeechRangeWithPreviousAsNeeded(startTime, endTime, speechRanges)) {
      speechRanges.push({ startTime, endTime });
    }
  }

  // Open and close a pending speech marker at boundaries. Closing the marker updates speechRanges.
  for(let keyframeI = 0; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];
    if (doesKeyframeHaveSpeechHeardByCharacter(keyframe, characterI, rooms)) {
      if (!_isSpeechMarkerOpen()) _openSpeechMarker(keyframe.time);
    } else {
      if (_isSpeechMarkerOpen()) _closeSpeechMarker(keyframe.time);
    }
  }

  // Speech scheduling should generate a closing keyframe without speech. This allows processing above 
  // to close out all speech markers.
  assert(!_isSpeechMarkerOpen()); 

  return subtractRanges(speechRanges, obscuredRanges);
}
  

export function createItineraryMarkerModel(timeline:Timeline|null, activeCharacterId:string, activeSkinIdAtSelection:string, 
    rooms:Room[], revealedSkinLinkages:SkinLinkages, obscuredRoomIds:Set<string>):ItineraryMarkerModel {
  
  const markers:ItineraryMarkerModel = {
    roomEntryTimes:[],
    speechRanges:[],
    encounterTimes:[],
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

  markers.obscuredRanges = _generateObscuredRanges(keyframes, activeCharacterI, rooms, obscuredRoomIds, revealedSkinIds, characterRoomEntries);
  markers.roomEntryTimes = _generateRoomEntryTimes(characterRoomEntries, markers.obscuredRanges);
  markers.encounterTimes = _generateEncounterTimes(roomEntryEvents, activeCharacterI, markers.obscuredRanges);
  markers.speechRanges = _generateSpeechRanges(keyframes, activeCharacterI, rooms, markers.obscuredRanges);

  return markers;
}