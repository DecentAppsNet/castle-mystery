import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import Level from "@/game/types/Level";
import LevelView from "@/components/levelView/LevelView";
import TimeSlider from "@/components/timeSlider/TimeSlider";
import { changeTime } from "@/game/playerEventUtil";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { updatePlayPause } from "./interactions/gameplay";

function HomeScreen() {
  const [level, setLevel] = useState<Level | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
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
        <TimeSlider minutes={0} step={1} onChange={(minutes) => {changeTime(minutes * 60 * 1000)}} />
        <PlayPauseButton isPlaying={isPlaying} onChange={(nextIsPlaying) => updatePlayPause(nextIsPlaying, setIsPlaying)} />
      </div>
    </div>
  );
}

export default HomeScreen;