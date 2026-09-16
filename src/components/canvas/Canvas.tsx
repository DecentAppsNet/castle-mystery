/** AI agent, Do not modify this file without discussion.
 */
import styles from './Canvas.module.css';
import {useRef, useEffect, useState, CSSProperties, MouseEventHandler} from 'react'

const NO_ANIMATION_IN_PROGRESS = -1;
let animationFrameId = NO_ANIMATION_IN_PROGRESS;

type DrawCallback = {
  (context:CanvasRenderingContext2D):void;
}

interface IProps {
  isAnimated:boolean,
  isFullScreen?:boolean,
  onClick?:MouseEventHandler<HTMLCanvasElement>,
  onDraw:DrawCallback,
  onDrawLoopStart?:(destWidth:number, destHeight:number) => void,
  onPageViewingChange?:(isViewingPage:boolean) => void,
  onExitFullScreen?:() => void,
  exitFullScreenText?:string,
  onMouseMove?:MouseEventHandler<HTMLCanvasElement>,
  onMouseDown?:MouseEventHandler<HTMLCanvasElement>,
  onMouseUp?:MouseEventHandler<HTMLCanvasElement>,
  onWheel?:(event:WheelEvent) => void
}

function _updateCanvasDimensions(container:HTMLDivElement, setContainerDimensions:Function,
    setFullScreenCanvasStyle:Function):[number,number] {
  const nextDimensions:[number,number] = [container.clientWidth, container.clientHeight];
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const nextFullScreenCanvasStyle:CSSProperties = { position:'fixed', top:`0`, left:`0`, width:`${screenWidth}px`, height: `${screenHeight}px`, zIndex:1000 };
  setContainerDimensions(nextDimensions);
  setFullScreenCanvasStyle(nextFullScreenCanvasStyle);
  return nextDimensions;
}

function Canvas(props:IProps) {
  const [containerDimensions, setContainerDimensions] = useState<[number,number]|null>(null);
  const [fullScreenCanvasStyle, setFullScreenCanvasStyle] = useState<CSSProperties>({});
  const { onClick, onDraw, onDrawLoopStart, onPageViewingChange, onExitFullScreen,
    onMouseDown, onMouseMove, onMouseUp, onWheel,
    isAnimated, isFullScreen, exitFullScreenText } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, canvasHeight] = containerDimensions ?? [0,0];

  useEffect(() => { // Handle mount.
    const container:HTMLDivElement|null = containerRef?.current;
    if (!container) return;
    window.addEventListener('resize', () => { _updateCanvasDimensions(container, setContainerDimensions, setFullScreenCanvasStyle);}, false);
  }, []);

  useEffect(() => { // Handle drawing.
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    let isDrawLoopActive = true;

    const container:HTMLDivElement|null = containerRef?.current;
    if (container) {
      const [destWidth, destHeight] = _updateCanvasDimensions(container, setContainerDimensions, setFullScreenCanvasStyle);
      onDrawLoopStart?.(destWidth, destHeight);
    }

    const render = () => {
      if (!isDrawLoopActive || document.hidden) return;
      if (context.canvas.width && context.canvas.height) onDraw(context);
      if (isDrawLoopActive && isAnimated) animationFrameId = window.requestAnimationFrame(render);
    };
    const onVisibilityChange = () => {
      const isViewingPage = !document.hidden;
      onPageViewingChange?.(isViewingPage);
      if (!isViewingPage) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = NO_ANIMATION_IN_PROGRESS;
      } else {
        render();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!document.hidden) render();

    return () => {
      isDrawLoopActive = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (isAnimated) window.cancelAnimationFrame(animationFrameId);
    }
  }, [onDraw, onDrawLoopStart, onPageViewingChange, isAnimated]);

  useEffect(() => { // Handle redrawing after canvas dimensions are updated.
    const context = canvasRef.current?.getContext('2d');
    if (document.hidden || !context || !context.canvas.width || !context.canvas.height) return;
    onDraw(context);
  }, [onDraw, containerDimensions]);

  useEffect(() => { // Handle wheel with a non-passive listener so callers can prevent page scrolling.
    const canvas = canvasRef.current;
    if (!canvas || !onWheel) return;
    canvas.addEventListener('wheel', onWheel, { passive:false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [onWheel]);

  const canvasStyle:CSSProperties = isFullScreen ? fullScreenCanvasStyle : {};
  const exitFullScreenButton = isFullScreen && onExitFullScreen 
    ? <button className={styles.exitButton} onClick={(e) => {e.stopPropagation(); onExitFullScreen()}}>
      {exitFullScreenText ?? 'Exit Fullscreen'}</button> 
    : null;

  const containerStyle:CSSProperties = { width: '100%', height: '100%', overflow: 'clip' };
  return (
    <div style={containerStyle} ref={containerRef}>
      {exitFullScreenButton}
      <canvas
        style={canvasStyle}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onClick}
        width={canvasWidth}
        height={canvasHeight}
        ref={canvasRef}
      />
    </div>
  );
}

export default Canvas;