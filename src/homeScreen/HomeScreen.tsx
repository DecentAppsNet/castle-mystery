import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import Level from "@/game/types/Level";
import LevelView from "@/components/levelView/LevelView";
import TimeSlider from "@/components/timeSlider/TimeSlider";

function HomeScreen() {
  const [level, setLevel] = useState<Level | null>(null);
  
  useEffect(() => {
    if (level) return;
    init().then((initResults) => {
      if (initResults) setLevel(initResults.level);
    });
  }, []);

  if (!level) return null;

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <LevelView level={level} />
        <TimeSlider minutes={45} step={1} onChange={() => {}} />
      </div>
    </div>
  );
}

export default HomeScreen;