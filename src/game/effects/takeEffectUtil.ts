import TakeEffect, { TakeTarget } from "./types/TakeEffect";

const TAKE_EFFECT_TIME = 500;

export const LEFT_HAND = 'left hand';
export const RIGHT_HAND = 'right hand';
export const INVENTORY = 'inventory';

export function createTakeEffect(itemId:string, target:TakeTarget, startTime:number):TakeEffect {
  return {
    kind:'takeItem',
    itemId,
    startTime,
    target,
    endTime:startTime+TAKE_EFFECT_TIME,
    handler:null
  }
}