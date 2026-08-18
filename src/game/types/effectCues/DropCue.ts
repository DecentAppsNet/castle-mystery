import Position from "../Position";
import EffectCueBase from "./EffectCueBase";

export const DROP_EFFECT_TIME = 500;

type DropCue = EffectCueBase & {
  itemId:string,
  targetPosition:Position
}

export function duplicateDropCue(from:DropCue):DropCue {
  return {...from};
}

export default DropCue;