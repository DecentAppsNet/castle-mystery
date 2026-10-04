import { useEffect, useRef } from 'react';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove, mouseWheel, playPause } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
import { pauseGameState, updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';
import Discoveries from '@/game/types/Discoveries';
import { drawCurtainOverlay } from './curtains';
import { announceInitialClosedFrame, cancelInitialClosedFrame, clearLevelView,
  prepareLevelViewCache, prepareLevelViewFrame } from './levelViewFrameUtil';
import type LevelViewFrameState from './types/LevelViewFrameState';
import type InitialClosedFrameHandoff from './types/InitialClosedFrameHandoff';

type Props = {
  gameState:GameState|null, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onConclusionsChanged:(conclusions:GameState['conclusions']) => void,
  onDiscoveriesChanged:(discoveries:Discoveries) => void,
  onInitialClosedFrame:() => void,
  hasLoadingFailed:boolean
}

function LevelView({gameState, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onConclusionsChanged,
  onDiscoveriesChanged, onInitialClosedFrame, hasLoadingFailed}:Props) {
  const gameStateRef = useRef<GameState|null>(gameState);
  const frameStateRef = useRef<LevelViewFrameState>({ transition:null, preparedCache:null });
  const startupHandoffRef = useRef<InitialClosedFrameHandoff>({ pendingFrame:null, hasAnnounced:false });

  useEffect(() => {
    const handoff = startupHandoffRef.current;
    return () => cancelInitialClosedFrame(handoff);
  }, []);
  
  useEffect(() => { 
    gameStateRef.current = gameState;
  }, [gameState]);

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={(context) => {
        const currentGameState = gameStateRef.current === gameState ? gameState : null;
        const { width, height } = context.canvas;
        const frame = prepareLevelViewFrame(frameStateRef.current, currentGameState,
          width, height, hasLoadingFailed, performance.now());
        if (frame.canRenderScene && currentGameState) {
          updateAndDraw(currentGameState, context, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged,
            onConclusionsChanged, onDiscoveriesChanged);
        } else {
          clearLevelView(context);
        }
        drawCurtainOverlay(context, frame, hasLoadingFailed);
        announceInitialClosedFrame(startupHandoffRef.current, onInitialClosedFrame);
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