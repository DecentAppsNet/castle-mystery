import { useEffect, useRef } from 'react';

import Level from "@/game/types/Level"
import Canvas from '../canvas/Canvas';
import { createGameStateFromLevel, updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';

type Props = {
  level:Level
}

function LevelView({level}:Props) {
  const gameStateRef = useRef<GameState>(null);
  
  useEffect(() => {
    gameStateRef.current = createGameStateFromLevel(level);
  }, [level]);

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={(context) => updateAndDraw(gameStateRef.current, context)} 
    />
  </div>;
}

export default LevelView;