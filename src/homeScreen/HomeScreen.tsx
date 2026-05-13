import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import TimeSlider from "@/homeScreen/timeSlider/TimeSlider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import ContentButton from '@/components/contentButton/ContentButton';
import { updatePlayPause, updateTime, updateTimeMsecs } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";
import { findNextRoomEntryTime, findPreviousRoomEntryTime } from "@/game/itineraryUtil";
import ClaimSolutionDialog from './dialogs/ClaimSolutionDialog';
import Solution from '@/game/solutions/types/Solution';

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

function _findFirstIncompleteSolution(gameState:GameState|null):Solution|null {
  if (!gameState) return null;
  return gameState.solutions.find(solution => !solution.isComplete) || null;
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;
  const isPlayPauseDisabled = !gameState || minutes >= toMinutes;
  const activeSolution = _findFirstIncompleteSolution(gameState);
  const isClaimSolutionDisabled = !activeSolution;
  
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
        <ContentButton
          text={activeSolution ? `Claim: ${activeSolution.title}` : 'No Solutions Remaining'}
          onClick={() => setModalDialogName(ClaimSolutionDialog.name)}
          disabled={isClaimSolutionDisabled}
        />
        {activeSolution && <ClaimSolutionDialog
          isOpen={modalDialogName === ClaimSolutionDialog.name}
          solution={activeSolution}
          imageSet={gameState.imageSet}
          onClose={() => setModalDialogName(null)}
          onClaim={() => false}
        />}
      </div>
    </div>
  );
}

export default HomeScreen;