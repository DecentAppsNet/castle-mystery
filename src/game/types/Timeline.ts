import TimelineKeyframe from "@/game/types/TimelineKeyframe";

type Timeline = Readonly<{
  roomIdToI:{[roomId:string]:number};
  characterIdToI:{[characterId:string]:number};
  keyframes: TimelineKeyframe[];
}>;

export function createDefaultTimeline():Timeline {
  return {
    roomIdToI:{},
    characterIdToI:{},
    keyframes:[]
  };
}

export default Timeline;