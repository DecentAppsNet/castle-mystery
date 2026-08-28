import Effect from "./types/Effect";

const TAKE_EFFECT_TIME = 500;

export const LEFT_HAND = 'left hand';
export const RIGHT_HAND = 'right hand';
export const INVENTORY = 'inventory';
export type TakeTarget = 'left hand' | 'right hand' | 'inventory';

export function createTakeEffect(_itemId:string, _target:TakeTarget, startTime:number):Effect {
  // TODO
  return {
    kind:'takeItem',
    startTime,
    endTime:startTime+TAKE_EFFECT_TIME,
    handler:null
  }
}