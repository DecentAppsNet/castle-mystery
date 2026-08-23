import Position from '@/game/types/Position';
import EffectBase from "./EffectBase";

export const DROP_EFFECT_TIME = 500;

type DropEffect = EffectBase & {
  itemId:string,
  targetPosition:Position
}

export function duplicateDropEffect(from:DropEffect):DropEffect {
  return {...from};
}

export default DropEffect;