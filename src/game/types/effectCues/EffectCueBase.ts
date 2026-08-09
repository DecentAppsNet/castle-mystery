type EffectCueKind = 'takeItem' | 'dropItem' | 'giveItem' | 'enterRoom' | 'lockExit' | 'unlockExit';

type EffectCueBase = {
  kind:EffectCueKind
}

export default EffectCueBase;