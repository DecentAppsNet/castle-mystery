import { isStringArray } from '@/common/typeUtil';

type LevelChange = {
  kind:'revealRoom',
  roomIds:string[]
} | {
  kind:'revealCharacterTitles'
} | {
  kind:'setLevelComplete'
}

export function isValidLevelChange(value:unknown):value is LevelChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const partial = value as Partial<LevelChange>;
  if (typeof partial.kind !== 'string') return false; 

  if (partial.kind === 'revealRoom') return isStringArray(partial.roomIds);

  return partial.kind === 'revealCharacterTitles' || partial.kind === 'setLevelComplete';
}

export default LevelChange;