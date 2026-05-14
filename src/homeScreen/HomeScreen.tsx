import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import TimeSlider from "@/homeScreen/timeSlider/TimeSlider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { updatePlayPause, updateSolutions, updateTime, updateTimeMsecs } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";
import { findNextRoomEntryTime, findPreviousRoomEntryTime } from "@/game/itineraryUtil";
import SolutionsView from "./solutionsView/SolutionsView";
import Solution from "@/game/solutions/types/Solution";

const ARROW_STEP_MSECS = 200;

function _findShiftArrowTargetTime(gameState:GameState, direction:number):number|null {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  if (!activeCharacter) return null;
  return direction > 0
    ? findNextRoomEntryTime(activeCharacter, gameState.time)
    : findPreviousRoomEntryTime(activeCharacter, gameState.time);
}

function _isEditableTarget(target:EventTarget|null):boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "BUTTON";
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;
  const isPlayPauseDisabled = !gameState || minutes >= toMinutes;
  
  useEffect(() => {
    if (gameState) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setGameState(initResults.gameState);
        setSolutions(initResults.gameState.solutions);
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
      const direction = event.code === "ArrowRight" ? 1 : -1;
      if (event.shiftKey) {
        const targetTime = _findShiftArrowTargetTime(gameState, direction);
        if (targetTime !== null) updateTimeMsecs(targetTime, gameState.duration, setIsPlaying);
        return;
      }
      updateTimeMsecs(gameState.time + direction * ARROW_STEP_MSECS, gameState.duration, setIsPlaying);
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
      <div className={styles.sidePane}>
        <SolutionsView 
          solutions={solutions} 
          imageSet={gameState.imageSet} 
          onUpdate={(nextSolutions) => { updateSolutions(nextSolutions, setSolutions)} }
        />
      </div>
    </div>
  );
}

export default HomeScreen;