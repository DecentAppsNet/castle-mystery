import { botch } from "decent-portal";

import TakeEffect, { duplicateTakeEffect } from "./TakeEffect";
import DropEffect, { duplicateDropEffect } from "./DropEffect";
import SpeechEffect, { duplicateSpeechEffect } from "./SpeechEffect";

type Effect = DropEffect|SpeechEffect|TakeEffect;

export function duplicateEffect(from:Effect):Effect {
  switch(from.kind) {
    case 'dropItem': return duplicateDropEffect(from as DropEffect);
    case 'speech': return duplicateSpeechEffect(from as SpeechEffect);
    case 'takeItem': return duplicateTakeEffect(from as TakeEffect);
    default: botch();
  }
}

export default Effect;