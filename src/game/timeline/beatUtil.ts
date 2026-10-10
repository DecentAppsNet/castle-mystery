import { assertNonNullable } from "decent-portal";
import { findRoomAtPosition } from "../roomUtil";
import Room from "../types/Room";
import Timeline from "../types/Timeline";
import TimelineKeyframe from "../types/TimelineKeyframe";
import { createKeyframeAtTime, findFollowingKeyframe, findPrecedingKeyframe } from "./retrievalUtil";
import CharacterKeyframe, { areCharacterKeyframesEqual } from "../types/CharacterKeyframe";
import { areRoomKeyframesEqual } from "../types/RoomKeyframe";

/*
Is there a generic way to get all the relevant beats?

Maybe just find first keyframe that affects something in the active room.

For all room keyframes...
  If the active room changes, return match. (Evaluate first, as other checks assume same active room)
  If room keyframe for active room does not match from room keyframe, return match
  If characters in active room have changed from active room, return match.
  If any from-identified character in active room has a different character key frame than from keyframe, return match.


  How do handle audible speech from other rooms?

  A function getAudibleAdjacentRoomSpeech():string[]. Call it for starting keyframe and each evaluated keyframe. If the returned texts don't match, then its a beat keyframe.
*/

function _findActiveCharacterRoomIdInKeyframe(baseRooms:Room[], keyframe:TimelineKeyframe, characterI:number):string {
  const position = keyframe.characters[characterI].position;
  const activeRoom = findRoomAtPosition(baseRooms, position.x, position.y);
  assertNonNullable(activeRoom);
  return activeRoom.id;
}

function _areCharacterIndicesEqual(a:number[], b:number[]):boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false; // Sequence of indexes should match, because they are generated from consistently ordered source.
  }
  return true;
}

function _findCharactersAtRoomInKeyframe(baseRooms:Room[], roomId:string, characterKeyframes:CharacterKeyframe[]):number[] {
  const characterIndices:number[] = [];
  characterKeyframes.forEach((ckf, characterI) => {
    const room = findRoomAtPosition(baseRooms, ckf.position.x, ckf.position.y);
    assertNonNullable(room);
    if (room.id === roomId) characterIndices.push(characterI);
  });
  return characterIndices;
}

function _collectStartingKeyframeInfo(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):{startingKeyframe:TimelineKeyframe,
    activeCharacterI:number, startingRoomId:string, startingRoomI:number, startingCharacterIndices:number[]} {
  const activeCharacterI = timeline.characterIdToI[activeCharacterId];
  const startingKeyframe = createKeyframeAtTime(timeline.keyframes, time);
  const startingRoomId = _findActiveCharacterRoomIdInKeyframe(baseRooms, startingKeyframe, activeCharacterI);
  const startingRoomI = timeline.roomIdToI[startingRoomId];
  const startingCharacterIndices = _findCharactersAtRoomInKeyframe(baseRooms, startingRoomId, startingKeyframe.characters);
  return { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices };
}

function _isBeatKeyframe(baseRooms:Room[], activeCharacterI:number, startingKeyframe:TimelineKeyframe, startingRoomId:string, startingRoomI:number,
      startingCharacterIndices:number[], keyframe:TimelineKeyframe):boolean {
    if (keyframe === startingKeyframe) return false;
    const roomId = _findActiveCharacterRoomIdInKeyframe(baseRooms, keyframe, activeCharacterI);
    if (roomId !== startingRoomId) return true;
    const characterIndices = _findCharactersAtRoomInKeyframe(baseRooms, startingRoomId, keyframe.characters);
    if (!_areCharacterIndicesEqual(characterIndices, startingCharacterIndices)) return true;

    // Active character is in same room, and nobody has entered or left the room since starting keyframe. 
    
    // Look for any changes to the room.
    if (!areRoomKeyframesEqual(startingKeyframe.rooms[startingRoomI], keyframe.rooms[startingRoomI])) return true;

    // Look for any changes to character keyframes for starting occupants.
    for (let characterI = 0; characterI < keyframe.characters.length; ++characterI) {
      if (!startingCharacterIndices.includes(characterI)) continue;
      if (!areCharacterKeyframesEqual(startingKeyframe.characters[characterI], keyframe.characters[characterI])) return true;
    }

    return false;
  }

export function findNextTimelineBeat(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):number {
  const { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices } =
      _collectStartingKeyframeInfo(baseRooms, timeline, time, activeCharacterId);

  const beatKeyframe = findFollowingKeyframe(timeline.keyframes, time, (keyframe) => 
    _isBeatKeyframe(baseRooms, activeCharacterI, startingKeyframe, startingRoomId, startingRoomI, startingCharacterIndices, keyframe)
  );
  if (beatKeyframe) return beatKeyframe.time;
  return timeline.keyframes[timeline.keyframes.length - 1].time; // TODO - fix to return true end of timeline or Infinity and let caller handle it.
}

export function findPreviousTimelineBeat(baseRooms:Room[], timeline:Timeline, time:number, activeCharacterId:string):number {
  const { startingKeyframe, activeCharacterI, startingRoomI, startingRoomId, startingCharacterIndices } =
      _collectStartingKeyframeInfo(baseRooms, timeline, time, activeCharacterId);

  const beatKeyframe = findPrecedingKeyframe(timeline.keyframes, time, (keyframe) => 
    _isBeatKeyframe(baseRooms, activeCharacterI, startingKeyframe, startingRoomId, startingRoomI, startingCharacterIndices, keyframe)
  );
  if (beatKeyframe) return beatKeyframe.time;
  return timeline.keyframes[0].time; // TODO - fix to return true end of timeline or -Infinity and let caller handle it.
}
