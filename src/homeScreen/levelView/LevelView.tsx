import { useEffect, useRef } from 'react';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
import { updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';

type Props = {
  gameState:GameState, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onSolutionsChanged:(solutions:GameState['solutions']) => void,
  isScrubbing?:boolean
}

function LevelView({gameState, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onSolutionsChanged, isScrubbing}:Props) {
  const gameStateRef = useRef<GameState>(null);
  
  useEffect(() => { 
    gameStateRef.current = gameState;
  }, [gameState]);

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={(context) => updateAndDraw(gameStateRef.current, context, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onSolutionsChanged, isScrubbing)} 
      onMouseDown={(e) => {
        if (!gameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, gameStateRef.current.scalingFactors);
        mouseDown(gameX, gameY);
      }}
      onMouseMove={(e) => {
        if (!gameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, gameStateRef.current.scalingFactors);
        mouseMove(gameX, gameY);
      }}
    />
  </div>;
}

export default LevelView;