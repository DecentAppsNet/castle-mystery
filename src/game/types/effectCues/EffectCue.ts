import { botch } from "decent-portal";
import TakeCue, { duplicateTakeCue } from "./TakeCue";

type EffectCue = TakeCue;

export function duplicateEffectCue(from:EffectCue):EffectCue {
  switch(from.kind) {
    case 'takeItem': return duplicateTakeCue(from);
    default:
      botch();
  }
}

export default EffectCue;