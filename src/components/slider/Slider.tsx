import styles from "./Slider.module.css";
import { clamp } from "@/common/numberUtil";

import {useState, useRef, useEffect} from "react";

type Props = {
  value: number;
  onChange?: (value:number) => void; // For getting final value after dragging.
  onUpdate?: (value:number) => void; // For getting updated values while dragging.
}

type LayoutMeasurements = {
  clientToContainerOffsetX: number;
  containerWidth: number;
  thumbWidth: number;
  travelWidth: number;
  minX: number;
  maxX: number;
}

function _initLayoutMeasurements():LayoutMeasurements {
  return { clientToContainerOffsetX:0, containerWidth: 0, thumbWidth: 0, travelWidth: 0, minX: 0, maxX: 0 };
}
function _calcLayoutMeasurements(container:HTMLDivElement, thumb:HTMLSpanElement):LayoutMeasurements {
  const thumbWidth = thumb.clientWidth;
  const containerWidth = container.clientWidth;
  const paddingWidth = Math.round(thumbWidth * .7);
  const travelWidth = containerWidth - (paddingWidth*2);
  const clientToContainerOffsetX = container.getBoundingClientRect().left;
  return { clientToContainerOffsetX, containerWidth, thumbWidth, travelWidth, minX: paddingWidth, maxX: paddingWidth + travelWidth };
}

function _calcThumbPosFromValue(value:number, layoutMeasurements:LayoutMeasurements):number {
  const {minX, travelWidth, thumbWidth} = layoutMeasurements;
  return minX + ((value/100) * travelWidth) - (thumbWidth/2);
}

function _calcValueFromThumbPos(thumbPos:number, layoutMeasurements:LayoutMeasurements):number {
  const {maxX, minX, thumbWidth, travelWidth} = layoutMeasurements;
  const ratio = (clamp(thumbPos + (thumbWidth/2), minX, maxX) - minX) / travelWidth;
  return ratio * 100;
}

function _calcThumbPosFromDragX(dragX:number, layoutMeasurements:LayoutMeasurements):number {
  const {minX, maxX, thumbWidth} = layoutMeasurements;
  return clamp(dragX, minX, maxX) - (thumbWidth/2);
}

function _updateLayoutMeasurementsAndThumbPos(container:HTMLDivElement, thumb:HTMLSpanElement, value:number, setLayoutMeasurements:Function, setThumbPos:Function) {
  const nextLayoutMeasurements = _calcLayoutMeasurements(container, thumb);
  setLayoutMeasurements(nextLayoutMeasurements);
  setThumbPos(_calcThumbPosFromValue(value, nextLayoutMeasurements));
}

function Slider({onChange, onUpdate, value}:Props) {
  const [thumbPos, setThumbPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [wasDragging, setWasDragging] = useState<boolean>(false);
  const [layoutMeasurements, setLayoutMeasurements] = useState<LayoutMeasurements>(_initLayoutMeasurements());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<number>(value);
  const isDraggingRef = useRef<boolean>(isDragging);
  const layoutMeasurementsRef = useRef<LayoutMeasurements>(layoutMeasurements);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    layoutMeasurementsRef.current = layoutMeasurements;
  }, [layoutMeasurements]);

  useEffect(() => { // Handle mount.
    const container:HTMLDivElement|null = containerRef?.current;
    const thumb:HTMLSpanElement|null = thumbRef?.current;
    if (!container || !thumb) return;
    _updateLayoutMeasurementsAndThumbPos(container, thumb, value, setLayoutMeasurements, setThumbPos);
    
    const _onResize = () => _updateLayoutMeasurementsAndThumbPos(container, thumb, valueRef.current, setLayoutMeasurements, setThumbPos);
    const _onMouseMove = (event:MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dragX = event.clientX - layoutMeasurementsRef.current.clientToContainerOffsetX;
      setThumbPos(_calcThumbPosFromDragX(dragX, layoutMeasurementsRef.current));
    };
    const _onMouseUp = () => setIsDragging(false);
    
    window.addEventListener('resize', _onResize, false);
    window.addEventListener('mousemove', _onMouseMove, false);
    window.addEventListener('mouseup', _onMouseUp, false);
    
    return () => {
      window.removeEventListener('resize', _onResize, false);
      window.removeEventListener('mousemove', _onMouseMove, false);
      window.removeEventListener('mouseup', _onMouseUp, false);
    }
  }, []);

  useEffect(() => {
    if (isDragging) return;
    const container:HTMLDivElement|null = containerRef?.current;
    const thumb:HTMLSpanElement|null = thumbRef?.current;
    if (!container || !thumb) return;
    _updateLayoutMeasurementsAndThumbPos(container, thumb, value, setLayoutMeasurements, setThumbPos);
  }, [value, isDragging]);
  
  useEffect(() => {
    const isSendingOnChange = !isDragging && wasDragging && onChange;
    const isSendingOnUpdate = isDragging && onUpdate;
    const nextValue = isSendingOnUpdate || isSendingOnChange ? _calcValueFromThumbPos(thumbPos, layoutMeasurements) : 0;
    if (isSendingOnUpdate) onUpdate(nextValue);
    if (isSendingOnChange) onChange(nextValue);
    if (isDragging !== wasDragging) setWasDragging(isDragging);
  }, [thumbPos, isDragging, wasDragging, layoutMeasurements]);

  function _onContainerMouseDown(event:React.MouseEvent<HTMLDivElement>) {
    if (event.target === thumbRef.current) return;
    const dragX = event.clientX - layoutMeasurements.clientToContainerOffsetX;
    setThumbPos(_calcThumbPosFromDragX(dragX, layoutMeasurements));
    setIsDragging(true);
  }
  
  return (
    <div 
      className={styles.container} 
      ref={containerRef}
      onMouseDown={_onContainerMouseDown}
    >
      <div className={styles.groove} />
      <span 
        className={styles.thumb}
        onMouseDown={() => setIsDragging(true)}
        style={{left: `${thumbPos}px`}} 
        ref={thumbRef}
      />
    </div>
  );
}

export default Slider;