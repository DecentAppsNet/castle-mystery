import Position from '@/game/types/Position';
import EffectBase from "./EffectBase";

type DropEffect = EffectBase & {
  itemId:string,
  targetPosition:Position
}

export function duplicateDropEffect(from:DropEffect):DropEffect {
  return {...from};
}

export default DropEffect;