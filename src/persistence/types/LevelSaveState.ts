import { isStringArray } from '@/common/typeUtil';

type LevelSaveState = {
  readonly time:number;
  readonly activeCharacterId:string;
  readonly discoveredRoomIds:readonly string[];
  readonly revealedRoomIds:readonly string[];
  readonly discoveredItemIds:readonly string[];
  readonly discoveredSkinIds:readonly string[];
  readonly titleKnownCharacterIds:readonly string[];
  readonly isLevelComplete:boolean;
}

export function isValidLevelSaveState(value:unknown):value is LevelSaveState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const save = value as Partial<LevelSaveState>;
  if (typeof save.time !== 'number' || !Number.isFinite(save.time)
    || typeof save.activeCharacterId !== 'string' || typeof save.isLevelComplete !== 'boolean') return false;
  return [save.discoveredRoomIds, save.revealedRoomIds, save.discoveredItemIds, save.discoveredSkinIds,
    save.titleKnownCharacterIds].every(isStringArray);
}

export default LevelSaveState;