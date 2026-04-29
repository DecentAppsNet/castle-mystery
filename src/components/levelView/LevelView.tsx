import { useEffect, useRef } from 'react';

import Level from "@/game/types/Level"
import Canvas from '../canvas/Canvas';
import { updateAndDrawLevel } from '@/game/levelUtil';
import styles from './LevelView.module.css';

type Props = {
  level:Level
}

function LevelView({level}:Props) {
  const levelStateRef = useRef<Level>(null);
  
  useEffect(() => {
    levelStateRef.current = level;
  }, [level]);

  return <div className={styles.container}>
    <Canvas isAnimated={true} onDraw={(context) => updateAndDrawLevel(level, context)} />
  </div>;
}

export default LevelView;