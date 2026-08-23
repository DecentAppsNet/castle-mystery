type EffectCueKind = 'dropItem' | 'enterRoom' | 'giveItem' | 'lockExit' | 'speech' | 'takeItem' | 'unlockExit';

type EffectCueBase = {
  kind:EffectCueKind,
  startTime:number,
  endTime:number
}

export default EffectCueBase;