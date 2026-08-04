import CharacterKeyframe, { duplicateCharacterKeyframe } from "@/game/types/CharacterKeyframe";
import RoomKeyframe, { duplicateRoomKeyframe } from "@/game/types/RoomKeyframe";

type TimelineKeyframe<
  TCharacter = CharacterKeyframe,
  TRoom = RoomKeyframe,
> = {
  time: number;
  characters: TCharacter[];
  rooms: TRoom[];
};

export function duplicateTimelineKeyframe(from:TimelineKeyframe):TimelineKeyframe {
  return {
    time:from.time,
    characters:from.characters.map(duplicateCharacterKeyframe),
    rooms:from.rooms.map(duplicateRoomKeyframe)
  }
}

export default TimelineKeyframe;

