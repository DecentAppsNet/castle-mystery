import { useEffect, useRef, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import { updateNextCharacter, updatePlayPause, updateConclusions, updateTime } from "./interactions/gameplay";
import { msecsToMinutes } from '@/common/timeUtil';
import GameState from "@/game/types/GameState";
import ConclusionsView from "./conclusionsView/ConclusionsView";
import DiscoveriesView from "./discoveriesView/DiscoveriesView";
import Conclusion from "@/game/conclusions/types/Conclusion";
import WinLevelDialog from "./dialogs/WinLevelDialog";
import LevelManifest from "@/levelLoading/types/LevelManifest";
import LevelSelector from "./levelSelector/LevelSelector";
import { changeLevel, continueToNextLevel, resetLevel } from "./interactions/levels";
import Discoveries, { createEmptyDiscoveries } from "@/game/types/Discoveries";
import { createDiscoveries } from "@/game/discoveriesUtil";
import TimeSlider from "./timeSlider/TimeSlider";
import type LevelViewHandle from './levelView/types/LevelViewHandle';
import type LevelLoadRequest from './types/LevelLoadRequest';
import { assert, assertNonNullable } from 'decent-portal';
import { clearPlayerEvents } from '@/game/playerEventUtil';
import { findNextTimelineBeat, findPreviousTimelineBeat } from '@/game/timeline/beatUtil';
import LevelSaveCoordinator from './levelSaveCoordinator';
import PreparedLevelState from './types/PreparedLevelState';

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
  const applicationRootRef = useRef<HTMLDivElement|null>(null);
  const levelViewRef = useRef<LevelViewHandle|null>(null);
  const loadRequestRef = useRef<LevelLoadRequest>({ pending:null, isMounted:true });
  const saveCoordinatorRef = useRef<LevelSaveCoordinator|null>(null);
  const saveGameStateRef = useRef<GameState|null>(null);
  const previousConclusionsRef = useRef<readonly Conclusion[]>([]);
  const isGameDisabledRef = useRef(true);
  const [isGameDisabled, setIsGameDisabled] = useState(true);
  const [gameState, setGameState] = useState<GameState|null>(null);
  const [levelManifest, setLevelManifest] = useState<LevelManifest|null>(null);
  const [initErrorMessage, setInitErrorMessage] = useState<string|null>(null);
  const [isInitialClosedFramePainted, setIsInitialClosedFramePainted] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [winSynopsis, setWinSynopsis] = useState<string>("");
  const [conclusions, setConclusions] = useState<Conclusion[]>([]);
  const [discoveries, setDiscoveries] = useState<Discoveries>(createEmptyDiscoveries());
  const [conclusionClaimCooldowns, setConclusionClaimCooldowns] = useState<Record<string, number>>({});
  const [, setActiveCharacterId] = useState<string>("");
  const [modalDialogName, setModalDialogName] = useState<string|null>(null);
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;
  // const isPlayPauseDisabled = !gameState || minutes >= toMinutes;

  useEffect(() => {
    const request = loadRequestRef.current;
    request.isMounted = true;
    return () => {
      request.isMounted = false;
      void saveCoordinatorRef.current?.stopAndSettle();
    };
  }, []);

  function _publishPreparedLevelState(prepared:PreparedLevelState) {
    saveGameStateRef.current = prepared.gameState;
    saveCoordinatorRef.current = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave);
    previousConclusionsRef.current = prepared.gameState.conclusions;
    setGameState(prepared.gameState);
  }

  function _handleStateChanged(updatedGameState:GameState) {
    if (loadRequestRef.current.isMounted && saveGameStateRef.current === updatedGameState) {
      saveCoordinatorRef.current?.observe();
    }
  }

  function _setGameDisabled(isDisabled:boolean) {
    isGameDisabledRef.current = isDisabled;
    if (applicationRootRef.current) applicationRootRef.current.inert = isDisabled;
    setIsGameDisabled(isDisabled);
  }

  function _isGameDisabled():boolean {
    return isGameDisabledRef.current;
  }

  function _handleTimeChange(nextMinutes:number) {
    if (_isGameDisabled()) return;
    updateTime(nextMinutes, setIsPlaying);
  }

  function _handlePlayPauseChange(nextIsPlaying:boolean) {
    if (_isGameDisabled()) return;
    updatePlayPause(nextIsPlaying, setIsPlaying);
  }

  function _handleOpeningStarted(preparedGameState:GameState) {
    // The same GameState object, after LevelView confirms cache readiness and starts opening.
    assert(preparedGameState.baseRooms.every(room => preparedGameState.roomShellCacheByRoomId.has(room.id)));
    if (!loadRequestRef.current.isMounted) return;
    clearPlayerEvents();
    setMinutes(msecsToMinutes(preparedGameState.time));
    setIsPlaying(preparedGameState.isPlaying);
    _setGameDisabled(false);
  }

  function _closeCurtain():Promise<boolean> {
    assertNonNullable(levelViewRef.current);
    _setGameDisabled(true);
    clearPlayerEvents();
    setInitErrorMessage(null);
    return levelViewRef.current.close();
  }

  function _handleLoadingFailed(error:unknown) {
    setInitErrorMessage(error instanceof Error ? error.message : 'Failed to load level.');
  }
  
  useEffect(() => {
    if (!isInitialClosedFramePainted || gameState) return;
    let isCancelled = false;
    init().then((initResults) => {
      if (!initResults || isCancelled) return;
      setMinutes(initResults.minutes);
      _publishPreparedLevelState(initResults);
      setLevelManifest(initResults.levelManifest);
      setWinSynopsis(initResults.gameState.winSynopsis);
      setConclusions(initResults.gameState.conclusions);
      setDiscoveries(createDiscoveries(initResults.gameState));
      setActiveCharacterId(initResults.gameState.activeCharacterId);
    }).catch((error:unknown) => {
      if (isCancelled) return;
      setInitErrorMessage(error instanceof Error ? error.message : 'Failed to initialize the app.');
    });

    return () => {
      isCancelled = true;
    };
  }, [isInitialClosedFramePainted]);

  function _handleConclusionsChanged(nextConclusions:Conclusion[]) {
    if (_shouldOpenWinLevelDialog(previousConclusionsRef.current, nextConclusions)) setModalDialogName(WinLevelDialog.name);
    previousConclusionsRef.current = nextConclusions;
    setConclusions(nextConclusions);
  }

  function _handleManualConclusionsUpdate(nextConclusions:Conclusion[]) {
    _handleConclusionsChanged(nextConclusions);
  }

  const isSliderAtRightmostPosition = minutes >= toMinutes;
  useEffect(() => {
    if (!gameState) return;
    const onKeyDown = (event:KeyboardEvent) => {
      if (_isGameDisabled()) return;
      if (event.repeat || _isEditableTarget(event.target)) return;

      if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
        event.preventDefault();
        const findBeat = event.code === "ArrowRight" ? findNextTimelineBeat : findPreviousTimelineBeat;
        const beatTime = findBeat(gameState.baseRooms, gameState.timeline, gameState.time, gameState.activeCharacterId);
        _handleTimeChange(msecsToMinutes(beatTime));
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (isSliderAtRightmostPosition) return; // Playing would just stop immediately.
        updatePlayPause(!isPlaying, setIsPlaying);
        return;
      }

      if (event.code === "Tab") {
        event.preventDefault();
        updateNextCharacter();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, isPlaying, isSliderAtRightmostPosition]);

  const timeSliderLevelData = !isGameDisabled && gameState ? {
    timeline:gameState.timeline,
    baseCharacters:gameState.baseCharacters,
    baseRooms:gameState.baseRooms,
    activeCharacterId:gameState.activeCharacterId,
    activeSkinIdAtSelection:gameState.activeSkinIdAtSelection,
    discoveryState:gameState.discoveryState,
    labels:gameState.labels
  } : null;

  return (
    <div ref={applicationRootRef} className={styles.container} inert={isGameDisabled}>
      <TopBar />
      <div className={styles.content}>
        {levelManifest && <LevelSelector
          levelManifest={levelManifest}
          onSelect={(levelUrl) => {
            void changeLevel({
              loadRequest:loadRequestRef.current,
              saveCoordinator:saveCoordinatorRef.current,
              closeCurtain:_closeCurtain,
              onLoadingFailed:_handleLoadingFailed,
              levelUrl,
              levelManifest,
              onLevelPrepared:_publishPreparedLevelState,
              setLevelManifest,
              setIsPlaying,
              setMinutes,
              setWinSynopsis,
              setConclusions,
              setDiscoveries,
              setConclusionClaimCooldowns,
              setActiveCharacterId,
              setModalDialogName
            });
          }}
        />}
        <LevelView 
          ref={levelViewRef}
          gameState={gameState} 
          isGameDisabled={_isGameDisabled}
          onMinutesChanged={setMinutes} 
          onIsPlayingChanged={setIsPlaying} 
          onActiveCharacterChanged={setActiveCharacterId} 
          onConclusionsChanged={_handleConclusionsChanged} 
          onDiscoveriesChanged={setDiscoveries} 
          onStateChanged={_handleStateChanged}
          onInitialClosedFrame={() => setIsInitialClosedFramePainted(true)}
          onOpeningStarted={_handleOpeningStarted}
          hasLoadingFailed={initErrorMessage !== null}
        />
        <TimeSlider
          fromMinutes={fromMinutes}
          toMinutes={toMinutes}
          minutes={minutes}
          levelData={timeSliderLevelData}
          isPlaying={isPlaying}
          onChange={_handleTimeChange}
          onPlayPauseChange={_handlePlayPauseChange}
        />
      </div>

      {gameState && <div className={styles.sidePane}>
        <div className={styles.conclusionsPane}>
          <ConclusionsView 
            conclusions={conclusions} 
            imageSet={gameState.imageSet} 
            conclusionClaimCooldowns={conclusionClaimCooldowns}
            onReset={() => {
              if (_isGameDisabled() || !levelManifest) return;
              void resetLevel({ levelManifest, loadRequest:loadRequestRef.current,
                saveCoordinator:saveCoordinatorRef.current, closeCurtain:_closeCurtain,
                onLoadingFailed:_handleLoadingFailed, onLevelPrepared:_publishPreparedLevelState,
                setLevelManifest, setIsPlaying, setMinutes, setWinSynopsis, setConclusions,
                setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId, setModalDialogName });
            }}
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
      </div>}
      {gameState && levelManifest && <WinLevelDialog 
        synopsis={winSynopsis} 
        isOpen={modalDialogName === WinLevelDialog.name} 
        onContinue={() => { void continueToNextLevel({levelManifest, onLevelPrepared:_publishPreparedLevelState, setLevelManifest, setIsPlaying,
            setMinutes, setWinSynopsis, setConclusions, setDiscoveries, setConclusionClaimCooldowns, setActiveCharacterId,
            setModalDialogName, loadRequest:loadRequestRef.current, closeCurtain:_closeCurtain,
            saveCoordinator:saveCoordinatorRef.current,
            onLoadingFailed:_handleLoadingFailed
          }); }}
        onReturn={() => setModalDialogName(null)} 
      />}
    </div>
  );
}

export default HomeScreen;