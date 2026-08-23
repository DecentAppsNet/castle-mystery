import EffectBase from "./EffectBase";

export const LEFT_HAND = 'left hand';
export const RIGHT_HAND = 'right hand';
export const INVENTORY = 'inventory';

export const TAKE_EFFECT_TIME = 500;

type TakeEffect = EffectBase & {
  itemId:string,
  target:'left hand'|'right hand'|'inventory'
}

export function duplicateTakeEffect(from:TakeEffect):TakeEffect {
  return {...from};
}

export default TakeEffect;