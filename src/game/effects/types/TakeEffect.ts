import EffectBase from "./EffectBase";

export type TakeTarget = 'left hand'|'right hand'|'inventory';

type TakeEffect = EffectBase & {
  itemId:string,
  target:TakeTarget
}

export function duplicateTakeEffect(from:TakeEffect):TakeEffect {
  return {...from};
}

export default TakeEffect;