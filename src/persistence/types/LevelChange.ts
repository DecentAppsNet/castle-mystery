type LevelChange = {
  kind:'revealRoom',
  roomId:string
} | {
  kind:'revealCharacterTitles'
} | {
  kind:'setLevelComplete'
}

export function isValidLevelChange(value:unknown):value is LevelChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const partial = value as Partial<LevelChange>;
  if (typeof partial.kind !== 'string') return false; 

  if (partial.kind === 'revealRoom') return typeof partial.roomId === 'string';

  return partial.kind === 'revealCharacterTitles' || partial.kind === 'setLevelComplete';
}

export default LevelChange;