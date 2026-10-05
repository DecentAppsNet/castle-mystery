import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove, mouseWheel, playPause } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
import { pauseGameState, updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';
import Discoveries from '@/game/types/Discoveries';
import { drawCurtainOverlay, isCurtainVisible } from './curtains';
import { announceInitialClosedFrame, clearLevelView,
  prepareLevelViewCache, prepareLevelViewFrame } from './levelViewFrameUtil';
import type LevelViewFrameState from './types/LevelViewFrameState';
import type InitialClosedFrameHandoff from './types/InitialClosedFrameHandoff';
import type LevelViewHandle from './types/LevelViewHandle';
import { announceCurtainClosed, cancelCurtainClose, requestCurtainClose } from './levelViewCloseUtil';

type Props = {
  ref?:Ref<LevelViewHandle>,
  gameState:GameState|null, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onConclusionsChanged:(conclusions:GameState['conclusions']) => void,
  onDiscoveriesChanged:(discoveries:Discoveries) => void,
  onInitialClosedFrame:() => void,
  hasLoadingFailed:boolean
}

function LevelView({ref, gameState, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onConclusionsChanged,
  onDiscoveriesChanged, onInitialClosedFrame, hasLoadingFailed}:Props) {
  const gameStateRef = useRef<GameState|null>(gameState);
  const frameStateRef = useRef<LevelViewFrameState>({ transition:null, preparedCache:null,
    closeRequest:null, awaitingReplacement:false });
  const startupHandoffRef = useRef<InitialClosedFrameHandoff>({ drawnAt:null, hasAnnounced:false });
  useImperativeHandle(ref, () => ({ close:() => requestCurtainClose(frameStateRef.current, performance.now()) }), []);

  useEffect(() => {
    const state = frameStateRef.current;
    return () => cancelCurtainClose(state);
  }, []);
  
  useEffect(() => { 
    if (gameStateRef.current !== gameState) frameStateRef.current.awaitingReplacement = false;
    gameStateRef.current = gameState;
  }, [gameState]);

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={(context, animationFrameTimestamp) => {
        const currentGameState = gameStateRef.current === gameState ? gameState : null;
        const { width, height } = context.canvas;
        const frame = prepareLevelViewFrame(frameStateRef.current, currentGameState, width, height, hasLoadingFailed, performance.now());
        if (frame.canRenderScene && currentGameState) {
          updateAndDraw(currentGameState, context, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged,
            onConclusionsChanged, onDiscoveriesChanged);
        } else {
          clearLevelView(context);
        }
        if (isCurtainVisible(frame)) drawCurtainOverlay(context, frame, hasLoadingFailed);
        if (frameStateRef.current.transition?.phase === 'closed' && animationFrameTimestamp !== null) {
          if (frameStateRef.current.closeRequest) announceCurtainClosed(frameStateRef.current, animationFrameTimestamp);
          if (!startupHandoffRef.current.hasAnnounced) announceInitialClosedFrame(startupHandoffRef.current, animationFrameTimestamp, onInitialClosedFrame);
        }
      }}
      onDrawLoopStart={(destWidth, destHeight) => {
        prepareLevelViewCache(frameStateRef.current, gameState, destWidth, destHeight);
      }}
      onPageViewingChange={(isViewingPage) => {
        const currentGameState = gameStateRef.current;
        if (isViewingPage || !currentGameState) return;
        pauseGameState(currentGameState);
        playPause(false);
        onIsPlayingChanged(false);
      }}
      onMouseDown={(e) => {
        if (!gameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, gameStateRef.current.scalingFactors);
        mouseDown(gameX, gameY);
      }}
      onMouseMove={(e) => {
        if (!gameStateRef.current) return;
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const [gameX, gameY] = canvasToGamePosition(x, y, gameStateRef.current.scalingFactors);
        mouseMove(gameX, gameY);
      }}
      onWheel={(e) => {
        e.preventDefault();
        mouseWheel(e.deltaY);
      }}
    />
  </div>;
}

export default LevelView;