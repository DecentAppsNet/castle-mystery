import CharacterKeyframe from "./CharacterKeyframe";
import TimelineKeyframe from "./TimelineKeyframe";
import RoomKeyframe from "./RoomKeyframe";

type EditableTimelineKeyframe = TimelineKeyframe<
  Partial<CharacterKeyframe>,
  Partial<RoomKeyframe>
>;

export default EditableTimelineKeyframe;