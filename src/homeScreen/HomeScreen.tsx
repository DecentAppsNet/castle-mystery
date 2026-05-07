import { useEffect, useState } from "react";
import { MSECS_IN_SECOND } from "@/common/timeUtil";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/components/levelView/LevelView";
import TimeSlider from "@/components/timeSlider/TimeSlider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { updatePlayPause, updateTime, updateTimeMsecs } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";

const ARROW_STEP_MSECS = MSECS_IN_SECOND * .2;
const ARROW_STEP_MSECS_WITH_MODIFIER = MSECS_IN_SECOND * 10;

function _isEditableTarget(target:EventTarget|null):boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "BUTTON";
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;
  const isPlayPauseDisabled = !gameState || minutes >= toMinutes;
  
  useEffect(() => {
    if (gameState) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setGameState(initResults.gameState);
      }
    });
  }, []);

  useEffect(() => {
    if (!gameState) return;
    const onKeyDown = (event:KeyboardEvent) => {
      if (event.repeat || _isEditableTarget(event.target)) return;

      if (event.code === "Space") {
        if (isPlayPauseDisabled) return;
        event.preventDefault();
        updatePlayPause(!isPlaying, setIsPlaying);
        return;
      }

      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
      event.preventDefault();
      const stepMsecs = event.ctrlKey || event.shiftKey ? ARROW_STEP_MSECS_WITH_MODIFIER : ARROW_STEP_MSECS;
      const direction = event.code === "ArrowRight" ? 1 : -1;
      updateTimeMsecs(gameState.time + direction * stepMsecs, gameState.duration, setIsPlaying);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, isPlaying, isPlayPauseDisabled]);

  if (!gameState) return null;

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <LevelView gameState={gameState} onMinutesChanged={setMinutes} onIsPlayingChanged={setIsPlaying} />
        <TimeSlider
          fromMinutes={fromMinutes}
          toMinutes={toMinutes}
          minutes={minutes}
          labels={gameState.labels}
          onChange={nextMinutes => updateTime(nextMinutes, setIsPlaying)}
        />
        <PlayPauseButton
          isPlaying={isPlaying}
          disabled={isPlayPauseDisabled}
          onChange={(nextIsPlaying) => updatePlayPause(nextIsPlaying, setIsPlaying)}
        />
      </div>
    </div>
  );
}

export default HomeScreen;