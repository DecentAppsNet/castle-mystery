import EffectHandler from "./EffectHandler";

type EffectKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'says' | 'thinks' | 'emits' | 'takeItem' | 'unlockExit';

type Effect = {
  kind:EffectKind,
  startTime:number,
  endTime:number,
  handler:EffectHandler|null
}

export function duplicateEffect(from:Effect):Effect {
  return {...from}
}

export default Effect;