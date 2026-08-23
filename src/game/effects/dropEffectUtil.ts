// const dropEffect:DropEffect = { kind:'dropItem', itemId, targetPosition:dropFloorPosition, startTime:scheduleTime, 
// endTime:scheduleTime + DROP_EFFECT_TIME };

import Position from "../types/Position";
import DropEffect from "./types/DropEffect";

const DROP_EFFECT_TIME = 500;

export function createDropEffect(itemId:string, targetPosition:Position, startTime:number):DropEffect {
  return {
    kind:'dropItem',
    itemId,
    targetPosition,
    startTime,
    endTime:startTime+DROP_EFFECT_TIME,
    handler:null
  }
}