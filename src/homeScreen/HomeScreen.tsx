import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import TimeSlider from "@/homeScreen/timeSlider/TimeSlider";
import { updateNextCharacter, updatePlayPause, updateSolutions, updateTime, updateTimeMsecs } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";
import { findNextRoomEntryTime, findPreviousRoomEntryTime } from "@/game/itineraryUtil";
import { findRoomAtPosition } from "@/game/roomUtil";
import SolutionsView from "./solutionsView/SolutionsView";
import Solution from "@/game/solutions/types/Solution";
import Itinerary from "@/game/types/Itinerary";
import WinLevelDialog from "./dialogs/WinLevelDialog";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import LevelSelector from "./levelSelector/LevelSelector";
import { changeLevel, continueToNextLevel } from "./interactions/levels";

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

function _isLevelComplete(solutions:ReadonlyArray<Solution>):boolean {
  return solutions.every(solution => !solution.isLocked && solution.isComplete);
}

function _shouldOpenWinLevelDialog(previousSolutions:ReadonlyArray<Solution>, nextSolutions:ReadonlyArray<Solution>):boolean {
  return _isLevelComplete(nextSolutions) && !_isLevelComplete(previousSolutions);
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [levelManifest, setLevelManifest] = useState<LevelManifest|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [winSynopsis, setWinSynopsis] = useState<string>("");
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [solutionClaimCooldowns, setSolutionClaimCooldowns] = useState<Record<string, number>>({});
  const [activeCharacterId, setActiveCharacterId] = useState<string>("");
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;
  const isPlayPauseDisabled = !gameState || minutes >= toMinutes;
  const activeInitialCharacter = !gameState
    ? null
    : gameState.initialCharacters.find(character => character.id === activeCharacterId) || null;
  const activeItinerary:Itinerary|null = !gameState
    ? null
    : activeInitialCharacter?.itinerary || null;
  const activeInitialRoomId = !gameState || !activeInitialCharacter
    ? null
    : findRoomAtPosition(gameState.initialRooms, activeInitialCharacter.position.x, activeInitialCharacter.position.y)?.id || null;
  
  useEffect(() => {
    if (gameState) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setGameState(initResults.gameState);
        setLevelManifest(initResults.levelManifest);
        setWinSynopsis(initResults.gameState.winSynopsis);
        setSolutions(initResults.gameState.solutions);
        setActiveCharacterId(initResults.gameState.characters[initResults.gameState.activeCharacterI]?.id || "");
        if (initResults.gameState.isLevelComplete) setModalDialogName(WinLevelDialog.name);
      }
    });
  }, []);

  function _handleSolutionsChanged(nextSolutions:Solution[]) {
    setSolutions(previousSolutions => {
      if (_shouldOpenWinLevelDialog(previousSolutions, nextSolutions)) setModalDialogName(WinLevelDialog.name);
      return nextSolutions;
    });
  }

  function _handleManualSolutionsUpdate(nextSolutions:Solution[]) {
    setSolutions(previousSolutions => {
      if (_shouldOpenWinLevelDialog(previousSolutions, nextSolutions)) setModalDialogName(WinLevelDialog.name);
      return nextSolutions;
    });
  }

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

      if (event.code === "Tab") {
        event.preventDefault();
        updateNextCharacter();
        return;
      }

      if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.code === "ArrowRight" ? 1 : -1;
      if (event.shiftKey) {
        const targetTime = _findShiftArrowTargetTime(gameState, direction);
        if (targetTime !== null) updateTimeMsecs(targetTime, gameState.startTime, gameState.duration, setIsPlaying);
        return;
      }
      updateTimeMsecs(gameState.time + direction * ARROW_STEP_MSECS, gameState.startTime, gameState.duration, setIsPlaying);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, isPlaying, isPlayPauseDisabled]);

  if (!gameState || !levelManifest) return null;

  return (
    <div className={styles.container}>
      <TopBar />
      <div className={styles.content}>
        <LevelSelector
          levelManifest={levelManifest}
          onSelect={(levelUrl) => {
            void changeLevel({
              levelUrl,
              levelManifest,
              setGameState,
              setLevelManifest,
              setIsPlaying,
              setMinutes,
              setWinSynopsis,
              setSolutions,
              setSolutionClaimCooldowns,
              setActiveCharacterId,
              setIsScrubbing,
              setModalDialogName
            });
          }}
        />
        <LevelView gameState={gameState} onMinutesChanged={setMinutes} onIsPlayingChanged={setIsPlaying} onActiveCharacterChanged={setActiveCharacterId} onSolutionsChanged={_handleSolutionsChanged} isScrubbing={isScrubbing} />
        <TimeSlider
          fromMinutes={fromMinutes}
          toMinutes={toMinutes}
          minutes={minutes}
          itinerary={activeItinerary}
          rooms={gameState.initialRooms}
          initialRoomId={activeInitialRoomId}
          labels={gameState.labels}
          isPlaying={isPlaying}
          isPlayPauseDisabled={isPlayPauseDisabled}
          onChange={nextMinutes => updateTime(nextMinutes, setIsPlaying)}
          onPlayPauseChange={(nextIsPlaying) => updatePlayPause(nextIsPlaying, setIsPlaying)}
          onScrubbingChange={setIsScrubbing}
        />
      </div>
      <div className={styles.sidePane}>
        <SolutionsView 
          solutions={solutions} 
          imageSet={gameState.imageSet} 
          solutionClaimCooldowns={solutionClaimCooldowns}
          onIncorrectClaim={(solutionId) => {
            setSolutionClaimCooldowns(from => ({
              ...from,
              [solutionId]: Date.now() + 2 * 60 * 1000
            }));
          }}
          onUpdate={(nextSolutions) => { updateSolutions(nextSolutions, _handleManualSolutionsUpdate)} }
        />
      </div>
      <WinLevelDialog 
        synopsis={winSynopsis} 
        isOpen={modalDialogName === WinLevelDialog.name} 
        onContinue={() => {
          void continueToNextLevel({
            levelManifest,
            setGameState,
            setLevelManifest,
            setIsPlaying,
            setMinutes,
            setWinSynopsis,
            setSolutions,
            setSolutionClaimCooldowns,
            setActiveCharacterId,
            setIsScrubbing,
            setModalDialogName
          });
        }}
        onReturn={() => setModalDialogName(null)} 
      />
    </div>
  );
}

export default HomeScreen;