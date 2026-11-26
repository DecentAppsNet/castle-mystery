import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { assertNonNullable } from 'decent-portal';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove, mouseWheel, playPause } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
import { findOverlayControlAtPoint } from '@/game/drawing/overlay';
import { pauseGameState, updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';
import Discoveries from '@/game/types/Discoveries';
import { drawCurtainOverlay, isCurtainVisible } from './curtains';
import { announceInitialClosedFrame, clearLevelView, prepareLevelViewCache, prepareLevelViewFrame } from './levelViewFrameUtil';
import type LevelViewFrameState from './types/LevelViewFrameState';
import type InitialClosedFrameHandoff from './types/InitialClosedFrameHandoff';
import type LevelViewHandle from './types/LevelViewHandle';
import { announceCurtainClosed, cancelCurtainClose, requestCurtainClose } from './levelViewCloseUtil';
import { drawBook, showBook, hideBook, onBookMouseDown, onBookMouseUp, onBookMouseOver, onBookMouseLeave, onBookMouseWheel, endBookPieceDrag } from '@/book';
import BookState from '@/book/types/BookState';
import { findMetaTimeNow } from '@/game/metaTimeUtil';
import { DRAW_FPS_COUNTER } from '@/developer/config';
import { updateAndDrawFps } from '@/developer/fpsUtil';

type Props = {
  ref?:Ref<LevelViewHandle>, // Enables imperative calls.
  gameState:GameState|null, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  bookState:BookState|null,
  loadedLevelUrl:string|null,
  isGameDisabled:() => boolean,
  onChapterLevelSelected:(levelUrl:string) => void,
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onConclusionsChanged:(conclusions:GameState['conclusions']) => void,
  onDiscoveriesChanged:(discoveries:Discoveries) => void,
  beforeWorldFrame:(gameState:GameState) => void,
  onStateChanged:(gameState:GameState) => void,
  onInitialClosedFrame:() => void,
  onOpeningStarted:(preparedGameState:GameState) => void, // preparedGameState is expected to have its room shell cache populated.
  hasLoadingFailed:boolean
}

/**
 * LevelView owns curtain progression; HomeScreen owns loading and supplies replacement data.
 * - Startup: the first draw establishes closed curtains. After a closed draw and a later
 *   animation-frame draw, onInitialClosedFrame permits HomeScreen to begin initialization.
 * - Closing: the parent's close() request starts closing and marks awaitingReplacement.
 *   The old scene keeps updating through curtain movement and lower-edge settling.
 * - Closed: settling completion stops scene updates and starts the minimum closed hold.
 *   After a settled closed draw and a later animation-frame draw, close() resolves so
 *   HomeScreen can load the next level. Retained old data cannot reopen the curtain.
 * - Opening: begins only after replacement acceptance, current-size cache preparation,
 *   and the closed hold are complete, with no loading failure. onOpeningStarted fires
 *   once at this boundary; the new scene updates behind the opening curtain.
 * - Open: opening animation completion hides the overlay; normal scene updates continue.
 *
 * The gameState effect accepts a changed object and clears awaitingReplacement. Until
 * that effect runs, draw callbacks with a different prop identity cannot use the scene.
 * Acceptance alone does not establish cache readiness or permission to open.
 * Failure keeps curtains closed; unmount cancels a pending close without starting loading.
 * Canvas owns scheduling; elapsed-time progression resumes on drawing after a hidden tab.
 */
function LevelView({ref, gameState, bookState, loadedLevelUrl, isGameDisabled, onChapterLevelSelected, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onConclusionsChanged,
    onDiscoveriesChanged, beforeWorldFrame, onStateChanged, onInitialClosedFrame, onOpeningStarted, hasLoadingFailed}:Props) {
  const acceptedGameStateRef = useRef<GameState|null>(gameState); // Game state instance that is ready for drawing use.
  const frameStateRef = useRef<LevelViewFrameState>({ transition:null, preparedCache:null,
    closeRequest:null, awaitingReplacement:false });
  const startupHandoffRef = useRef<InitialClosedFrameHandoff>({ drawnAt:null, hasAnnounced:false });
  const pointerClientPositionRef = useRef<readonly [number, number]|null>(null);
  const cancelBookDragRef = useRef<(() => void)|null>(null);
  const draggedBookRef = useRef<BookState|null>(null);
  const finishBookHideRef = useRef<((completed:boolean) => void)|null>(null);

  function _isInputDisabled():boolean {
    return isGameDisabled() || !acceptedGameStateRef.current
      || (bookState?.isVisible === true && (bookState.animationKind !== null || bookState.claimState !== null));
  }

  function _cancelInvalidBookDrag() {
    const draggedBookState = draggedBookRef.current;
    if (draggedBookState === null) return;
    if (draggedBookState !== bookState || !gameState || gameState !== acceptedGameStateRef.current
      || draggedBookState.pieceDragState === null || !draggedBookState.isVisible || draggedBookState.animationKind !== null
      || isGameDisabled()) cancelBookDragRef.current?.();
  }

  useLayoutEffect(_cancelInvalidBookDrag);
  useLayoutEffect(() => () => cancelBookDragRef.current?.(), []);

  useImperativeHandle(ref, () => ({ close:async (hideBookFirst = false) => {
    if (hideBookFirst && bookState?.isVisible) {
      const completed = await new Promise<boolean>(resolve => {
        finishBookHideRef.current = resolve;
        hideBook(findMetaTimeNow(), bookState, (_metaTime, isAborted) => {
          finishBookHideRef.current = null;
          resolve(!isAborted);
        });
      });
      if (!completed) return false;
    }
    return requestCurtainClose(frameStateRef.current, performance.now());
  } }), [bookState]);

  useEffect(() => {
    const state = frameStateRef.current;
    return () => {
      finishBookHideRef.current?.(false);
      finishBookHideRef.current = null;
      cancelCurtainClose(state);
    };
  }, []);
  
  useEffect(() => { 
    if (acceptedGameStateRef.current !== gameState) frameStateRef.current.awaitingReplacement = false;
    acceptedGameStateRef.current = gameState;
  }, [gameState]);

  function _startBookDragTracking(canvas:HTMLCanvasElement, draggedBookState:BookState) {
    const listeners = new AbortController();
    const draggedGameState = acceptedGameStateRef.current;
    function _cancel() {
      listeners.abort();
      endBookPieceDrag(draggedBookState);
      cancelBookDragRef.current = null;
      draggedBookRef.current = null;
    }

    function _onWindowMouse(event:MouseEvent) {
      const isRelease = event.type === 'mouseup';
      if (isRelease && event.button !== 0) return;
      if (draggedBookState.pieceDragState === null || draggedBookRef.current !== draggedBookState
        || !acceptedGameStateRef.current || acceptedGameStateRef.current !== draggedGameState
        || isGameDisabled() || (!isRelease && (event.buttons & 1) === 0)) return _cancel();

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return _cancel();
      const canvasX = (event.clientX - rect.left) * canvas.width / rect.width;
      const canvasY = (event.clientY - rect.top) * canvas.height / rect.height;
      if (isRelease) {
        onBookMouseUp(canvasX, canvasY, findMetaTimeNow(), draggedBookState);
        _cancel();
      } else {
        onBookMouseOver(canvasX, canvasY, findMetaTimeNow(), draggedBookState);
        if (draggedBookState.pieceDragState === null) _cancel();
      }
    }

    cancelBookDragRef.current = _cancel;
    draggedBookRef.current = draggedBookState;
    window.addEventListener('mousemove', _onWindowMouse, { signal:listeners.signal });
    window.addEventListener('mouseup', _onWindowMouse, { signal:listeners.signal });
    window.addEventListener('blur', _cancel, { signal:listeners.signal });
    window.addEventListener('resize', _cancel, { signal:listeners.signal });
  }

  function _handleMinutesChanged(minutes:number) {
    if (isGameDisabled()) return;
    onMinutesChanged(minutes);
  }

  function _handleIsPlayingChanged(isPlaying:boolean) {
    if (isGameDisabled()) return;
    onIsPlayingChanged(isPlaying);
  }

  function _updateOverlayCursor(context:CanvasRenderingContext2D) {
    const pointer = pointerClientPositionRef.current;
    if (!pointer || _isInputDisabled()) return;
    const rect = context.canvas.getBoundingClientRect();
    const canvasX = (pointer[0] - rect.left) * context.canvas.width / rect.width;
    const canvasY = (pointer[1] - rect.top) * context.canvas.height / rect.height;
    if (findOverlayControlAtPoint(canvasX, canvasY)) context.canvas.style.cursor = 'pointer';
  }

  function _updateAndDrawScene(currentGameState:GameState, context:CanvasRenderingContext2D) {
    if (!isGameDisabled()) beforeWorldFrame(currentGameState);
    updateAndDraw(currentGameState, context, _handleMinutesChanged, _handleIsPlayingChanged, onActiveCharacterChanged,
        onConclusionsChanged, onDiscoveriesChanged, onStateChanged);
    _updateOverlayCursor(context);
  }

  function _onDraw(context:CanvasRenderingContext2D, animationFrameTimestamp:number|null) {
    const frameStartMetaTime = findMetaTimeNow();
    _cancelInvalidBookDrag();
    const state = frameStateRef.current;
    const startupHandoff = startupHandoffRef.current;
    const currentGameState = acceptedGameStateRef.current === gameState ? gameState : null;
    const { width, height } = context.canvas;
    const previousPhase = state.transition?.phase;
    const frame = prepareLevelViewFrame(state, currentGameState, width, height, hasLoadingFailed, performance.now());

    if (previousPhase !== 'opening' && state.transition?.phase === 'opening' && currentGameState) {
      onOpeningStarted(currentGameState);
    }

    if (frame.canRenderScene && currentGameState) {
      _updateAndDrawScene(currentGameState, context);
    } else {
      clearLevelView(context);
    }
    if (isCurtainVisible(frame)) drawCurtainOverlay(context, frame, hasLoadingFailed);
    if (bookState && (!frame.canRenderScene || !bookState.isVisible || _isInputDisabled())) onBookMouseLeave(bookState);
    if (frame.canRenderScene && currentGameState && bookState?.isVisible) {
      drawBook(bookState, findMetaTimeNow(), currentGameState.imageSet, context, loadedLevelUrl);
    }
    _cancelInvalidBookDrag();
    if (frame.canRenderScene && currentGameState && DRAW_FPS_COUNTER) {
      updateAndDrawFps(frameStartMetaTime, findMetaTimeNow(), context);
    }

    if (state.transition?.phase === 'closed' && animationFrameTimestamp !== null) {
      if (state.closeRequest) announceCurtainClosed(state, animationFrameTimestamp);
      if (!startupHandoff.hasAnnounced) announceInitialClosedFrame(startupHandoff, animationFrameTimestamp, onInitialClosedFrame);
    }
  }

  return <div className={styles.container} onMouseLeave={() => {
    pointerClientPositionRef.current = null;
    if (bookState) onBookMouseLeave(bookState);
  }}>
    <Canvas 
      isAnimated={true} 
      onDraw={_onDraw}
      onDrawLoopStart={(destWidth, destHeight) => {
        prepareLevelViewCache(frameStateRef.current, gameState, destWidth, destHeight);
      }}
      onPageViewingChange={(isViewingPage) => {
        if (!isViewingPage) {
          cancelBookDragRef.current?.();
          if (bookState) onBookMouseLeave(bookState);
        }
        const currentGameState = acceptedGameStateRef.current;
        if (isViewingPage || !currentGameState) return;
        pauseGameState(currentGameState, onStateChanged);
        playPause(false);
        _handleIsPlayingChanged(false);
      }}
      onMouseDown={(e) => {
        if (cancelBookDragRef.current) return;
        if (_isInputDisabled()) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const canvasX = (e.clientX - rect.left) * e.currentTarget.width / rect.width;
        const canvasY = (e.clientY - rect.top) * e.currentTarget.height / rect.height;
        if (bookState?.isVisible) {
          if (onBookMouseDown(canvasX, canvasY, findMetaTimeNow(), bookState, e.button === 0, onChapterLevelSelected, loadedLevelUrl)) {
            e.preventDefault();
            _startBookDragTracking(e.currentTarget, bookState);
          }
          return;
        }
        if (findOverlayControlAtPoint(canvasX, canvasY) === 'book') {
          if (bookState) showBook(findMetaTimeNow(), bookState);
          return;
        }
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        assertNonNullable(acceptedGameStateRef.current);
        const [gameX, gameY] = canvasToGamePosition(x, y, acceptedGameStateRef.current.scalingFactors);
        mouseDown(gameX, gameY);
      }}
      onMouseUp={(e) => {
        if (cancelBookDragRef.current) return;
        if (_isInputDisabled()) return;
        const currentGameState = acceptedGameStateRef.current;
        if (!currentGameState || !bookState?.isVisible) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left) * e.currentTarget.width / rect.width;
        const canvasY = (e.clientY - rect.top) * e.currentTarget.height / rect.height;
        onBookMouseUp(canvasX, canvasY, findMetaTimeNow(), bookState);
      }}
      onMouseMove={(e) => {
        pointerClientPositionRef.current = [e.clientX, e.clientY];
        if (cancelBookDragRef.current) return;
        if (_isInputDisabled()) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        if (bookState?.isVisible) {
          const canvasX = (e.clientX - rect.left) * e.currentTarget.width / rect.width;
          const canvasY = (e.clientY - rect.top) * e.currentTarget.height / rect.height;
          onBookMouseOver(canvasX, canvasY, findMetaTimeNow(), bookState);
          return;
        }
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        assertNonNullable(acceptedGameStateRef.current);
        const [gameX, gameY] = canvasToGamePosition(x, y, acceptedGameStateRef.current.scalingFactors);
        mouseMove(gameX, gameY);
      }}
      onWheel={(e) => {
        if (_isInputDisabled()) return;
        e.preventDefault();
        if (acceptedGameStateRef.current && bookState?.isVisible) {
          onBookMouseWheel(e.deltaY, findMetaTimeNow(), bookState);
          return;
        }
        mouseWheel(e.deltaY);
      }}
    />
  </div>;
}

export default LevelView;