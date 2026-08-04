import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import RoomKeyframe from "@/game/types/RoomKeyframe";

type EditableTimelineKeyframe = TimelineKeyframe<
  Partial<CharacterKeyframe>,
  Partial<RoomKeyframe>
>;

export default EditableTimelineKeyframe;