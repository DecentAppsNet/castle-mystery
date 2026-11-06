import GameState from '@/game/types/GameState';

type PreparedLevelState = {
  readonly gameState:GameState;
  readonly levelUrl:string;
  readonly needsInitialSave:boolean;
};

export default PreparedLevelState;