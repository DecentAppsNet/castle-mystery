import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/components/levelView/LevelView";
import TimeSlider from "@/components/timeSlider/TimeSlider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { updatePlayPause, updateTime } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  
  useEffect(() => {
    if (gameState) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setGameState(initResults.gameState);
      }
    });
  }, []);

  if (!gameState) return null;

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <LevelView gameState={gameState} onMinutesChanged={setMinutes} />
        <TimeSlider minutes={minutes} step={1} onChange={nextMinutes => updateTime(nextMinutes, setIsPlaying)} />
        <PlayPauseButton isPlaying={isPlaying} onChange={(nextIsPlaying) => updatePlayPause(nextIsPlaying, setIsPlaying)} />
      </div>
    </div>
  );
}

export default HomeScreen;