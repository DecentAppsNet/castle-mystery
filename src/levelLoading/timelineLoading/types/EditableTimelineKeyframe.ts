import CharacterKeyframe from "@/game/types/CharacterKeyframe";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import RoomKeyframe from "@/game/types/RoomKeyframe";

/** A sparse timeline keyframe containing partial character and room state. */
type EditableTimelineKeyframe = TimelineKeyframe<
  Partial<CharacterKeyframe>,
  Partial<RoomKeyframe>
>;

export default EditableTimelineKeyframe;