import LevelChange, { isValidLevelChange } from "./LevelChange";

type LevelChanges = { 
  changes:LevelChange[];
}

export function isValidLevelChanges(value:unknown):value is LevelChanges {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const partial = value as Partial<LevelChanges>;
  if (!Array.isArray(partial.changes)) return false;
  return partial.changes.every(isValidLevelChange);
}

export default LevelChanges;