import Position from "../types/Position";
import Effect from "./types/Effect";

const DROP_EFFECT_TIME = 500;

export function createDropEffect(_itemId:string, _targetPosition:Position, startTime:number):Effect {
  // TODO
  return {
    kind:'dropItem',
    startTime,
    endTime:startTime+DROP_EFFECT_TIME,
    handler:null
  }
}