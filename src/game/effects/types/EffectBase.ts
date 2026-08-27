import EffectHandler from "./EffectHandler";

type EffectKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'speech' | 'takeItem' | 'unlockExit';

type EffectBase = {
  kind:EffectKind,
  startTime:number,
  endTime:number,
  handler:EffectHandler|null
}

export default EffectBase;