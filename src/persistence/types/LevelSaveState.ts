type LevelSaveState = {
  readonly time:number;
  readonly activeCharacterId:string;
  readonly discoveredRoomIds:readonly string[];
  readonly discoveredItemIds:readonly string[];
  readonly discoveredSkinIds:readonly string[];
  readonly titleKnownCharacterIds:readonly string[];
  readonly completedConclusionIds:readonly string[];
  readonly incompleteConclusionAnswerIndexesById:{
    readonly [conclusionId:string]:readonly number[]|undefined;
  };
}

function _isStringArray(value:unknown):value is readonly string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}

export function isValidLevelSaveState(value:unknown):value is LevelSaveState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const save = value as Partial<LevelSaveState>;
  if (typeof save.time !== 'number' || !Number.isFinite(save.time)
    || typeof save.activeCharacterId !== 'string') return false;
  if (![save.discoveredRoomIds, save.discoveredItemIds, save.discoveredSkinIds,
    save.titleKnownCharacterIds, save.completedConclusionIds].every(_isStringArray)) return false;

  const answers = save.incompleteConclusionAnswerIndexesById;
  return typeof answers === 'object' && answers !== null && !Array.isArray(answers)
    && Object.values(answers).every(indexes => Array.isArray(indexes)
      && indexes.every(index => Number.isInteger(index)));
}

export default LevelSaveState;