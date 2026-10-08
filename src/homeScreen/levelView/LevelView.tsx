import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove, mouseWheel, playPause } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
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

type Props = {
  ref?:Ref<LevelViewHandle>, // Enables imperative calls.
  gameState:GameState|null, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  isGameDisabled:() => boolean,
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onConclusionsChanged:(conclusions:GameState['conclusions']) => void,
  onDiscoveriesChanged:(discoveries:Discoveries) => void,
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
function LevelView({ref, gameState, isGameDisabled, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onConclusionsChanged,
    onDiscoveriesChanged, onInitialClosedFrame, onOpeningStarted, hasLoadingFailed}:Props) {
  const acceptedGameStateRef = useRef<GameState|null>(gameState); // Game state instance that is ready for drawing use.
  const frameStateRef = useRef<LevelViewFrameState>({ transition:null, preparedCache:null,
    closeRequest:null, awaitingReplacement:false });
  const startupHandoffRef = useRef<InitialClosedFrameHandoff>({ drawnAt:null, hasAnnounced:false });

  useImperativeHandle(ref, () => ({ close:() => requestCurtainClose(frameStateRef.current, performance.now()) }), []);

  useEffect(() => {
    const state = frameStateRef.current;
    return () => cancelCurtainClose(state);
  }, []);
  
  useEffect(() => { 
    if (acceptedGameStateRef.current !== gameState) frameStateRef.current.awaitingReplacement = false;
    acceptedGameStateRef.current = gameState;
  }, [gameState]);

  function _handleMinutesChanged(minutes:number) {
    if (isGameDisabled()) return;
    onMinutesChanged(minutes);
  }

  function _handleIsPlayingChanged(isPlaying:boolean) {
    if (isGameDisabled()) return;
    onIsPlayingChanged(isPlaying);
  }

  function _updateAndDrawScene(currentGameState:GameState, context:CanvasRenderingContext2D) {
    updateAndDraw(currentGameState, context, _handleMinutesChanged, _handleIsPlayingChanged, onActiveCharacterChanged,
        onConclusionsChanged, onDiscoveriesChanged);
  }

  function _onDraw(context:CanvasRenderingContext2D, animationFrameTimestamp:number|null) {
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

    if (state.transition?.phase === 'closed' && animationFrameTimestamp !== null) {
      if (state.closeRequest) announceCurtainClosed(state, animationFrameTimestamp);
      if (!startupHandoff.hasAnnounced) announceInitialClosedFrame(startupHandoff, animationFrameTimestamp, onInitialClosedFrame);
    }
  }

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={_onDraw}
      onDrawLoopStart={(destWidth, destHeight) => {
        prepareLevelViewCache(frameStateRef.current, gameState, destWidth, destHeight);
      }}
      onPageViewingChange={(isViewingPage) => {
        const currentGameState = acceptedGameStateRef.current;
        if (isViewingPage || !currentGameState) return;
        pauseGameState(currentGameState);
        playPause(false);
        _handleIsPlayingChanged(false);
      }}
      onMouseDown={(e) => {
        if (isGameDisabled()) return;
        if (!acceptedGameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, acceptedGameStateRef.current.scalingFactors);
        mouseDown(gameX, gameY);
      }}
      onMouseMove={(e) => {
        if (isGameDisabled()) return;
        if (!acceptedGameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, acceptedGameStateRef.current.scalingFactors);
        mouseMove(gameX, gameY);
      }}
      onWheel={(e) => {
        if (isGameDisabled()) return;
        e.preventDefault();
        mouseWheel(e.deltaY);
      }}
    />
  </div>;
}

export default LevelView;