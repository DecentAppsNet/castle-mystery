import { useEffect, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import TimeSlider from "@/homeScreen/timeSlider/TimeSlider";
import { updateNextCharacter, updatePlayPause, updateConclusions, updateTime, updateTimeMsecs } from "./interactions/gameplay";
import GameState from "@/game/types/GameState";
import { findNextRoomEntryTime, findPreviousRoomEntryTime } from "@/game/itineraryUtil";
import { findRoomAtPosition } from "@/game/roomUtil";
import ConclusionsView from "./conclusionsView/ConclusionsView";
import DiscoveriesView from "./discoveriesView/DiscoveriesView";
import Conclusion from "@/game/conclusions/types/Conclusion";
import Itinerary from "@/game/types/Itinerary";
import WinLevelDialog from "./dialogs/WinLevelDialog";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import LevelSelector from "./levelSelector/LevelSelector";
import { changeLevel, continueToNextLevel } from "./interactions/levels";
import Discoveries, { createEmptyDiscoveries } from "@/game/types/Discoveries";
import { createDiscoveries } from "@/game/discoveriesUtil";

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

function _isLevelComplete(conclusions:ReadonlyArray<Conclusion>):boolean {
  return conclusions.every(conclusion => !conclusion.isLocked && conclusion.isComplete);
}

function _shouldOpenWinLevelDialog(previousConclusions:ReadonlyArray<Conclusion>, nextConclusions:ReadonlyArray<Conclusion>):boolean {
  return _isLevelComplete(nextConclusions) && !_isLevelComplete(previousConclusions);
}

function HomeScreen() {
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [levelManifest, setLevelManifest] = useState<LevelManifest|null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [winSynopsis, setWinSynopsis] = useState<string>("");
  const [conclusions, setConclusions] = useState<Conclusion[]>([]);
  const [discoveries, setDiscoveries] = useState<Discoveries>(createEmptyDiscoveries());
  const [conclusionClaimCooldowns, setConclusionClaimCooldowns] = useState<Record<string, number>>({});
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
    let isCancelled = false;
    init().then((initResults) => {
      if (!initResults || isCancelled) return;
      setMinutes(initResults.minutes);
      setGameState(initResults.gameState);
      setLevelManifest(initResults.levelManifest);
      setWinSynopsis(initResults.gameState.winSynopsis);
      setConclusions(initResults.gameState.conclusions);
      setDiscoveries(createDiscoveries(initResults.gameState));
      setActiveCharacterId(initResults.gameState.characters[initResults.gameState.activeCharacterI]?.id || "");
      if (initResults.gameState.isLevelComplete) setModalDialogName(WinLevelDialog.name);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  function _handleConclusionsChanged(nextConclusions:Conclusion[]) {
    setConclusions(previousConclusions => {
      if (_shouldOpenWinLevelDialog(previousConclusions, nextConclusions)) setModalDialogName(WinLevelDialog.name);
      return nextConclusions;
    });
  }

  function _handleManualConclusionsUpdate(nextConclusions:Conclusion[]) {
    setConclusions(previousConclusions => {
      if (_shouldOpenWinLevelDialog(previousConclusions, nextConclusions)) setModalDialogName(WinLevelDialog.name);
      return nextConclusions;
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
              setConclusions,
              setDiscoveries,
              setConclusionClaimCooldowns,
              setActiveCharacterId,
              setIsScrubbing,
              setModalDialogName
            });
          }}
        />
        <LevelView gameState={gameState} onMinutesChanged={setMinutes} onIsPlayingChanged={setIsPlaying} onActiveCharacterChanged={setActiveCharacterId} onConclusionsChanged={_handleConclusionsChanged} onDiscoveriesChanged={setDiscoveries} isScrubbing={isScrubbing} />
        <TimeSlider
          fromMinutes={fromMinutes}
          toMinutes={toMinutes}
          minutes={minutes}
          itinerary={activeItinerary}
          characters={gameState.initialCharacters}
          rooms={gameState.initialRooms}
          roomsRevision={gameState.conclusionsRevision}
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
        <div className={styles.conclusionsPane}>
          <ConclusionsView 
            conclusions={conclusions} 
            imageSet={gameState.imageSet} 
            conclusionClaimCooldowns={conclusionClaimCooldowns}
            onIncorrectClaim={(conclusionId) => {
              setConclusionClaimCooldowns(from => ({
                ...from,
                [conclusionId]: Date.now() + 2 * 60 * 1000
              }));
            }}
            onUpdate={(nextConclusions) => { updateConclusions(nextConclusions, _handleManualConclusionsUpdate)} }
          />
        </div>
        <div className={styles.discoveriesPane}>
          <DiscoveriesView discoveries={discoveries} />
        </div>
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
            setConclusions,
            setDiscoveries,
            setConclusionClaimCooldowns,
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