import CharacterKeyframe from "./CharacterKeyframe";
import ItineraryKeyframe from "./ItineraryKeyframe";
import RoomKeyframe from "./RoomKeyframe";

type EditableItineraryKeyframe = ItineraryKeyframe<
  Partial<CharacterKeyframe>,
  Partial<RoomKeyframe>
>;

export default EditableItineraryKeyframe;