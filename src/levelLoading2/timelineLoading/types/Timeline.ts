import TimelineKeyframe from "./TimelineKeyframe";

type Timeline = Readonly<{
  roomIdToI:{[roomId:string]:number};
  characterIdToI:{[characterId:string]:number};
  keyframes: TimelineKeyframe[];
}>;

export default Timeline;