import { botch } from "decent-portal";
import TakeCue, { duplicateTakeCue } from "./TakeCue";
import DropCue, { duplicateDropCue } from "./DropCue";

type EffectCue = TakeCue|DropCue;

export function duplicateEffectCue(from:EffectCue):EffectCue {
  switch(from.kind) {
    case 'takeItem': return duplicateTakeCue(from as TakeCue);
    case 'dropItem': return duplicateDropCue(from as DropCue);
    default:
      botch();
  }
}

export default EffectCue;