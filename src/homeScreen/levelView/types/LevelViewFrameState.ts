import type GameState from '@/game/types/GameState';
import type CurtainTransition from '../curtains/types/CurtainTransition';

/** LevelView-owned preparation and transition state retained across draw callback restarts. */
type LevelViewFrameState = {
  /** Null before the first draw; that draw starts the initial closed hold. Never reset to null during this mount. */
  transition:CurtainTransition|null,
  /** Null until room-shell caches have first been prepared for a loaded game state and positive canvas dimensions. */
  preparedCache:Readonly<{ gameState:GameState, width:number, height:number }>|null
};

export default LevelViewFrameState;