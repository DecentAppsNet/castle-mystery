import { useEffect, useRef, useState } from "react";

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
import {
  createSolutionPhraseAnimationQueueItems,
  SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS,
  SolutionPhraseAnimationQueueItem
} from "./solutionsView/solutionPhraseAnimationUtil";

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

function _countUniqueRemainingPhrases(solutions:Solution[]):number {
  return new Set(solutions.flatMap(solution => solution.lockedRemainingPhrases)).size;
}

function _countDiscoveredPhrases(totalRequiredPhraseCount:number, solutions:Solution[]):number {
  return Math.max(0, totalRequiredPhraseCount - _countUniqueRemainingPhrases(solutions));
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const solutionsRef = useRef<Solution[]>([]);
  const [solutionClaimCooldowns, setSolutionClaimCooldowns] = useState<Record<string, number>>({});
  const [solutionPhraseAnimationQueue, setSolutionPhraseAnimationQueue] = useState<SolutionPhraseAnimationQueueItem[]>([]);
  const [activeSolutionPhraseAnimation, setActiveSolutionPhraseAnimation] = useState<SolutionPhraseAnimationQueueItem|null>(null);
  const [displayedDiscoveredPhraseCount, setDisplayedDiscoveredPhraseCount] = useState<number>(0);
  const [activeCharacterId, setActiveCharacterId] = useState<string>("");
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
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
    : findRoomAtPosition(gameState.initialRooms, activeInitialCharacter.x, activeInitialCharacter.y)?.id || null;
  
  useEffect(() => {
    if (gameState) return;
    init().then((initResults) => {
      if (initResults) {
        setMinutes(initResults.minutes);
        setGameState(initResults.gameState);
        setSolutions(initResults.gameState.solutions);
        solutionsRef.current = initResults.gameState.solutions;
        setDisplayedDiscoveredPhraseCount(_countDiscoveredPhrases(initResults.gameState.requiredSolutionPhraseCount, initResults.gameState.solutions));
        setActiveCharacterId(initResults.gameState.characters[initResults.gameState.activeCharacterI]?.id || "");
      }
    });
  }, []);

  useEffect(() => {
    if (activeSolutionPhraseAnimation || !solutionPhraseAnimationQueue.length) return;
    const [nextAnimation, ...remainingQueue] = solutionPhraseAnimationQueue;
    setActiveSolutionPhraseAnimation(nextAnimation);
    setSolutionPhraseAnimationQueue(remainingQueue);
  }, [activeSolutionPhraseAnimation, solutionPhraseAnimationQueue]);

  useEffect(() => {
    if (!activeSolutionPhraseAnimation) return;

    const countdownTimeout = window.setTimeout(() => {
      setDisplayedDiscoveredPhraseCount(from => from + 1);
    }, SOLUTION_PHRASE_ANIMATION_COUNTDOWN_MSECS);

    const completionTimeout = window.setTimeout(() => {
      setActiveSolutionPhraseAnimation(current => current?.id === activeSolutionPhraseAnimation.id ? null : current);
    }, activeSolutionPhraseAnimation.durationMsecs);

    return () => {
      window.clearTimeout(countdownTimeout);
      window.clearTimeout(completionTimeout);
    };
  }, [activeSolutionPhraseAnimation]);

  function _handleSolutionsChanged(nextSolutions:Solution[]) {
    const previousSolutions = solutionsRef.current;
    const nextQueueItems = createSolutionPhraseAnimationQueueItems(previousSolutions, nextSolutions);

    solutionsRef.current = nextSolutions;
    setSolutions(nextSolutions);
    if (nextQueueItems.length) {
      setSolutionPhraseAnimationQueue(from => [...from, ...nextQueueItems]);
    } else if (gameState) {
      setDisplayedDiscoveredPhraseCount(_countDiscoveredPhrases(gameState.requiredSolutionPhraseCount, nextSolutions));
    }
  }

  function _handleManualSolutionsUpdate(nextSolutions:Solution[]) {
    solutionsRef.current = nextSolutions;
    setSolutions(nextSolutions);
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
          discoveredPhraseCount={displayedDiscoveredPhraseCount}
          totalPhraseCount={gameState.requiredSolutionPhraseCount}
          activePhraseAnimation={activeSolutionPhraseAnimation}
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
    </div>
  );
}

export default HomeScreen;