import TimelineKeyframe from "@/game/types/TimelineKeyframe";

type Timeline = Readonly<{
  startTime:number;
  endTime:number;
  roomIdToI:{[roomId:string]:number};
  characterIds:string[];
  characterIdToI:{[characterId:string]:number};
  keyframes: TimelineKeyframe[];
}>;

export function createDefaultTimeline():Timeline {
  return {
    startTime:0,
    endTime:0,
    roomIdToI:{},
    characterIds:[],
    characterIdToI:{},
    keyframes:[]
  };
}

export default Timeline;