type EffectKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'speech' | 'takeItem' | 'unlockExit';

type EffectBase = {
  kind:EffectKind,
  startTime:number,
  endTime:number
}

export default EffectBase;