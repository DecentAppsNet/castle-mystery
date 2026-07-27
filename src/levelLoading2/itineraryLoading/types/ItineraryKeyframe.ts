import CharacterKeyframe, { duplicateCharacterKeyframe } from "./CharacterKeyframe";
import RoomKeyframe, { duplicateRoomKeyframe } from "./RoomKeyframe";

type ItineraryKeyframe<
  TCharacter = CharacterKeyframe,
  TRoom = RoomKeyframe,
> = {
  time: number;
  characters: TCharacter[];
  rooms: TRoom[];
};

export function duplicateItineraryKeyframe(from:ItineraryKeyframe):ItineraryKeyframe {
  return {
    time:from.time,
    characters:from.characters.map(duplicateCharacterKeyframe),
    rooms:from.rooms.map(duplicateRoomKeyframe)
  }
}

export default ItineraryKeyframe;

