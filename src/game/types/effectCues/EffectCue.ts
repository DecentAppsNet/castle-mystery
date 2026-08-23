import { botch } from "decent-portal";
import TakeCue, { duplicateTakeCue } from "./TakeCue";
import DropCue, { duplicateDropCue } from "./DropCue";
import SpeechCue, { duplicateSpeechCue } from "./SpeechCue";

type EffectCue = DropCue|SpeechCue|TakeCue;

export function duplicateEffectCue(from:EffectCue):EffectCue {
  switch(from.kind) {
    case 'dropItem': return duplicateDropCue(from as DropCue);
    case 'speech': return duplicateSpeechCue(from as SpeechCue);
    case 'takeItem': return duplicateTakeCue(from as TakeCue);
    default:
      botch();
  }
}

export default EffectCue;