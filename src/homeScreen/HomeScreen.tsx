import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import Level from "@/game/types/Level";
import LevelView from "@/components/levelView/LevelView";
import TimeSlider from "@/components/timeSlider/TimeSlider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { updatePlayPause, updateTime } from "./interactions/gameplay";

function HomeScreen() {
  const [level, setLevel] = useState<Level | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  
  useEffect(() => {
    if (level) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setLevel(initResults.level);
      }
    });
  }, []);

  if (!level) return null;

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <LevelView level={level} />
        <TimeSlider minutes={minutes} step={1} onChange={nextMinutes => updateTime(nextMinutes, setIsPlaying)} />
        <PlayPauseButton isPlaying={isPlaying} onChange={(nextIsPlaying) => updatePlayPause(nextIsPlaying, setIsPlaying)} />
      </div>
    </div>
  );
}

export default HomeScreen;