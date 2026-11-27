import { useEffect, useRef, useState } from "react";

import styles from './HomeScreen.module.css';
import { init } from "./interactions/initialization";
import TopBar from '@/components/topBar/TopBar';
import LevelView from "@/homeScreen/levelView/LevelView";
import { updateNextCharacter, updatePlayPause, updateTime } from "./interactions/gameplay";
import { msecsToMinutes } from '@/common/timeUtil';
import GameState from "@/game/types/GameState";
import DiscoveriesView from "./discoveriesView/DiscoveriesView";
import { changeLevel, resetLevel } from "./interactions/levels";
import { urlToFilename } from '@/common/urlUtil';
import { pushLevelChanges } from '@/persistence/levelChangeQueue';
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
import { BookSaveCoordinator, findBookImageUrls } from '@/book';
import { createImageSet, ImageSet } from '@/imageLoading';
import InitResults from './types/InitResults';
import { acceptPreparedLevelState } from './levelPreparation';
import BookState from "@/book/types/BookState";

function _isEditableTarget(target:EventTarget|null):boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "BUTTON";
}

function HomeScreen() {
  const applicationRootRef = useRef<HTMLDivElement|null>(null);
  const levelViewRef = useRef<LevelViewHandle|null>(null);
  const loadRequestRef = useRef<LevelLoadRequest>({ pending:null, isMounted:true });
  const imageSetRef = useRef<ImageSet|null>(null);
  const initPromiseRef = useRef<Promise<InitResults>|null>(null);
  const bookSaveCoordinatorRef = useRef<BookSaveCoordinator|null>(null);
  const saveCoordinatorRef = useRef<LevelSaveCoordinator|null>(null);
  const saveGameStateRef = useRef<GameState|null>(null);
  const isGameDisabledRef = useRef(true);
  const [isGameDisabled, setIsGameDisabled] = useState(true);
  const [loadedLevel, setLoadedLevel] = useState<{ gameState:GameState, levelUrl:string }|null>(null);
  const gameState = loadedLevel?.gameState ?? null;
  const [bookState, setBookState] = useState<BookState|null>(null);
  const [initErrorMessage, setInitErrorMessage] = useState<string|null>(null);
  const [storageErrorMessage, setStorageErrorMessage] = useState<string|null>(null);
  const [isInitialClosedFramePainted, setIsInitialClosedFramePainted] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [minutes, setMinutes] = useState<number>(0);
  const [discoveries, setDiscoveries] = useState<Discoveries>(createEmptyDiscoveries());
  const [, setActiveCharacterId] = useState<string>("");
  const fromMinutes = gameState?.labels[0]?.minutes ?? 0;
  const toMinutes = gameState?.labels[gameState.labels.length - 1]?.minutes ?? fromMinutes;

  useEffect(() => {
    const request = loadRequestRef.current;
    request.isMounted = true;
    return () => {
      request.isMounted = false;
      void bookSaveCoordinatorRef.current?.stopAndSettle();
      void saveCoordinatorRef.current?.stopAndSettle();
    };
  }, []);

  function _reportBookStorageError(error:unknown):void {
    const message = 'Unable to save pending world changes.';
    console.error(message, error);
    if (loadRequestRef.current.isMounted) setStorageErrorMessage(message);
  }

  async function _publishPreparedLevelState(prepared:PreparedLevelState, sessionBookState:BookState|null = bookState,
    saveFreshBook:boolean = false) {
    assertNonNullable(sessionBookState);
    const bookWriter = bookSaveCoordinatorRef.current;
    assertNonNullable(bookWriter);
    await bookWriter.acceptLevelChapter(prepared.level, prepared.levelUrl, _reportBookStorageError, saveFreshBook);
    if (!loadRequestRef.current.isMounted) return;
    acceptPreparedLevelState(prepared, findBookImageUrls(sessionBookState));
    saveGameStateRef.current = prepared.gameState;
    saveCoordinatorRef.current = new LevelSaveCoordinator(prepared.levelUrl, prepared.gameState, prepared.needsInitialSave,
      message => { if (loadRequestRef.current.isMounted) setStorageErrorMessage(message); });
    setLoadedLevel({ gameState:prepared.gameState, levelUrl:prepared.levelUrl });
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

  function _closeCurtain(hideBookFirst:boolean = false):Promise<boolean> {
    assertNonNullable(levelViewRef.current);
    _setGameDisabled(true);
    clearPlayerEvents();
    setInitErrorMessage(null);
    return levelViewRef.current.close(hideBookFirst);
  }

  function _handleLoadingFailed(error:unknown) {
    setInitErrorMessage(error instanceof Error ? error.message : 'Failed to load level.');
  }

  async function _initializeSession():Promise<InitResults> {
    if (!imageSetRef.current) imageSetRef.current = await createImageSet();
    return init(imageSetRef.current);
  }
  
  useEffect(() => {
    if (!isInitialClosedFramePainted || gameState) return;
    let isCancelled = false;
    if (!initPromiseRef.current) {
      initPromiseRef.current = Promise.resolve().then(_initializeSession).catch((error:unknown) => {
        initPromiseRef.current = null;
        console.error(error);
        throw error;
      });
    }
    initPromiseRef.current.then(async (initResults) => {
      if (isCancelled || !loadRequestRef.current.isMounted) return;
      setMinutes(initResults.minutes);
      bookSaveCoordinatorRef.current = new BookSaveCoordinator(initResults.bookUrl, initResults.bookState,
        initResults.bookLoadKind === 'unsupportedVersion',
        message => { if (loadRequestRef.current.isMounted) setStorageErrorMessage(message); });
      await _publishPreparedLevelState(initResults, initResults.bookState, initResults.bookLoadKind === 'fresh');
      if (isCancelled || !loadRequestRef.current.isMounted) return;
      setBookState(initResults.bookState);
      setDiscoveries(createDiscoveries(initResults.gameState));
      setActiveCharacterId(initResults.gameState.activeCharacterId);
    }).catch((error:unknown) => {
      if (isCancelled || !loadRequestRef.current.isMounted) return;
      setInitErrorMessage(error instanceof Error ? error.message : 'Failed to initialize the app.');
    });

    return () => {
      isCancelled = true;
    };
  }, [isInitialClosedFramePainted]);

  function _handleRevealLevel() {
    if (_isGameDisabled()) return;
    assertNonNullable(loadedLevel);
    void pushLevelChanges(urlToFilename(loadedLevel.levelUrl), { kind:'setLevelComplete' }).catch(_reportBookStorageError);
  }

  function _handleResetLevel() {
    if (_isGameDisabled()) return;
    assertNonNullable(imageSetRef.current);
    assertNonNullable(loadedLevel);
    void resetLevel({ imageSet:imageSetRef.current, levelUrl:loadedLevel.levelUrl, loadRequest:loadRequestRef.current,
      saveCoordinator:saveCoordinatorRef.current, closeCurtain:_closeCurtain,
      onLoadingFailed:_handleLoadingFailed, onLevelPrepared:_publishPreparedLevelState,
      setIsPlaying, setMinutes, setDiscoveries, setActiveCharacterId });
  }

  function _handleLevelSelect(levelUrl:string, hideBookFirst:boolean = false) {
    if (_isGameDisabled()) return;
    assertNonNullable(imageSetRef.current);
    _setGameDisabled(true);
    clearPlayerEvents();
    void changeLevel({ imageSet:imageSetRef.current, levelUrl, loadRequest:loadRequestRef.current,
      saveCoordinator:saveCoordinatorRef.current, closeCurtain:() => _closeCurtain(hideBookFirst),
      onLoadingFailed:_handleLoadingFailed, onLevelPrepared:_publishPreparedLevelState,
      setIsPlaying, setMinutes, setDiscoveries, setActiveCharacterId });
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
      <TopBar
        levelUrls={bookState?.levelUrls ?? []}
        onLoadLevel={_handleLevelSelect}
        onRevealLevel={_handleRevealLevel}
        onResetLevel={_handleResetLevel}
      />
      <div className={styles.content}>
        <LevelView 
          ref={levelViewRef}
          gameState={gameState} 
          bookState={bookState}
          onStorageError={_reportBookStorageError}
          loadedLevelUrl={loadedLevel?.levelUrl ?? null}
          isGameDisabled={_isGameDisabled}
          onChapterLevelSelected={levelUrl => _handleLevelSelect(levelUrl, true)}
          onMinutesChanged={setMinutes} 
          onIsPlayingChanged={setIsPlaying} 
          onActiveCharacterChanged={setActiveCharacterId} 
          onDiscoveriesChanged={setDiscoveries} 
          onStateChanged={_handleStateChanged}
          beforeWorldFrame={state => { if (state === saveGameStateRef.current) saveCoordinatorRef.current?.beforeFrame(); }}
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
        <div className={styles.discoveriesPane}>
          <DiscoveriesView discoveries={discoveries} />
        </div>
      </div>}
      {storageErrorMessage && <p className={styles.storageError} role="alert">{storageErrorMessage}</p>}
    </div>
  );
}

export default HomeScreen;