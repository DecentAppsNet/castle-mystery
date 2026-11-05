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

// TODO check for object to contain all members in expected types as LevelSaveState.
export function isValidLevelSaveState(_obj:any):boolean {
  return true;
}

export default LevelSaveState;