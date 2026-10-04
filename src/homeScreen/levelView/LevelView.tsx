import { useEffect, useRef } from 'react';

import Canvas from '@/components/canvas/Canvas';
import { mouseDown, mouseMove, mouseWheel, playPause } from '@/game/playerEventUtil';
import { canvasToGamePosition } from '@/game/drawing/drawUtil';
import { prepareRoomShellCache } from '@/game/drawing/gameStateDrawUtil';
import { pauseGameState, updateAndDraw } from '@/game/gameUtil';
import styles from './LevelView.module.css';
import GameState from '@/game/types/GameState';
import Discoveries from '@/game/types/Discoveries';
import { calculateCurtainFrame, drawCurtainOverlay } from './curtains';
import type CurtainTransition from './curtains/types/CurtainTransition';

type PreparedRoomShellCache = {
  gameState:GameState,
  width:number,
  height:number
};

type Props = {
  gameState:GameState|null, // Pass to initialize game state, e.g. load a new level. It will be updated in game loop after that.
  onMinutesChanged:(minutes:number) => void,
  onIsPlayingChanged:(isPlaying:boolean) => void,
  onActiveCharacterChanged:(characterId:string) => void,
  onConclusionsChanged:(conclusions:GameState['conclusions']) => void,
  onDiscoveriesChanged:(discoveries:Discoveries) => void
}

function LevelView({gameState, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged, onConclusionsChanged, onDiscoveriesChanged}:Props) {
  const gameStateRef = useRef<GameState|null>(gameState);
  const roomShellCachePreparedRef = useRef<PreparedRoomShellCache|null>(null);
  const curtainTransitionRef = useRef<CurtainTransition|null>(null);
  
  useEffect(() => { 
    gameStateRef.current = gameState;
  }, [gameState]);

  return <div className={styles.container}>
    <Canvas 
      isAnimated={true} 
      onDraw={(context) => {
        const now = performance.now();
        if (!curtainTransitionRef.current) {
          curtainTransitionRef.current = { phase:gameState ? 'open' : 'closed', startedAt:now };
        }
        const frame = calculateCurtainFrame(curtainTransitionRef.current, now);
        const currentGameState = gameStateRef.current;
        const { width, height } = context.canvas;

        if (frame.canRenderScene && currentGameState && currentGameState === gameState) {
          const prepared = roomShellCachePreparedRef.current;
          if (prepared?.gameState !== currentGameState || prepared.width !== width || prepared.height !== height) {
            prepareRoomShellCache(currentGameState, width, height);
            roomShellCachePreparedRef.current = { gameState:currentGameState, width, height };
          }
          updateAndDraw(currentGameState, context, onMinutesChanged, onIsPlayingChanged, onActiveCharacterChanged,
            onConclusionsChanged, onDiscoveriesChanged);
        } else {
          context.clearRect(0, 0, width, height);
          context.canvas.style.cursor = 'default';
        }
        drawCurtainOverlay(context, frame);
      }}
      onDrawLoopStart={(destWidth, destHeight) => {
        if (!gameState || destWidth <= 0 || destHeight <= 0) return;
        prepareRoomShellCache(gameState, destWidth, destHeight);
        roomShellCachePreparedRef.current = { gameState, width:destWidth, height:destHeight };
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