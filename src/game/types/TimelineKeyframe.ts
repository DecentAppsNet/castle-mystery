import CharacterKeyframe, { areCharacterKeyframesEqual, duplicateCharacterKeyframe } from "@/game/types/CharacterKeyframe";
import RoomKeyframe, { areRoomKeyframesEqual, duplicateRoomKeyframe } from "@/game/types/RoomKeyframe";

type TimelineKeyframe<
  TCharacter = CharacterKeyframe,
  TRoom = RoomKeyframe,
> = {
  time: number;
  characters: TCharacter[];
  rooms: TRoom[];
};

export function duplicateTimelineKeyframe(from:TimelineKeyframe, isDuplicatingEffects = true):TimelineKeyframe {
  return {
    time:from.time,
    characters:from.characters.map(ckf => duplicateCharacterKeyframe(ckf, isDuplicatingEffects)),
    rooms:from.rooms.map(duplicateRoomKeyframe)
  }
}

export function areTimelineKeyframesEqual(a:TimelineKeyframe, b:TimelineKeyframe):boolean {
  if (a === b) return true;
  if (a.time !== b.time || a.characters.length !== b.characters.length || a.rooms.length !== b.rooms.length) return false;
  return a.characters.every((ckf:CharacterKeyframe, i:number) => areCharacterKeyframesEqual(ckf, b.characters[i])) &&
    a.rooms.every((rkf:RoomKeyframe, i:number) => areRoomKeyframesEqual(rkf, b.rooms[i]));
}

export default TimelineKeyframe;