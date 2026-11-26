import GameState from '@/game/types/GameState';
import Level from '@/levelLoading/types/Level';

type PreparedLevelState = {
  readonly level:Level;
  readonly gameState:GameState;
  readonly levelUrl:string;
  readonly needsInitialSave:boolean;
};

export default PreparedLevelState;