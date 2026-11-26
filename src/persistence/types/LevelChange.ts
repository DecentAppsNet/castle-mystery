type LevelChange = {
  kind:'revealRoom',
  roomIds:string[]
} | {
  kind:'revealCharacterTitles'
} | {
  kind:'setLevelComplete'
}

function _isStringArray(value:unknown):value is readonly string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}

export function isValidLevelChange(value:unknown):value is LevelChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const partial = value as Partial<LevelChange>;
  if (typeof partial.kind !== 'string') return false; 

  if (partial.kind === 'revealRoom') return _isStringArray(partial.roomIds);

  return partial.kind === 'revealCharacterTitles' || partial.kind === 'setLevelComplete';
}

export default LevelChange;