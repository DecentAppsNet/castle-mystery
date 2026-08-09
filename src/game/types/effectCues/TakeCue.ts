import EffectCueBase from "./EffectCueBase";

export const LEFT_HAND = 'left hand';
export const RIGHT_HAND = 'right hand';
export const INVENTORY = 'inventory';

export const TAKE_EFFECT_TIME = 1000;

type TakeCue = EffectCueBase & {
  itemId:string,
  target:'left hand'|'right hand'|'inventory'
}

export function duplicateTakeCue(from:TakeCue):TakeCue {
  return {...from};
}

export default TakeCue;