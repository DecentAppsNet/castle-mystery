import styles from "./TimeSlider.module.css";

import Slider from "../slider/Slider";
import { useEffect, useRef, useState } from "react";
import { calcTimeLabelPositions } from "./labelUtil";
import TimeLabel from "@/game/types/TimeLabel";
import TimeLabelPositions from "./types/TimeLabelPositions";

const NO_QUANTIZING = -1;

type Props = {
  fromMinutes:number; // Minimum value in minutes for when slider thumb is at leftmost position.
  toMinutes:number; // Maximum value in minutes for when slider thumb is at rightmost position.
  minutes: number; // Affects position of the slider thumb. Clamped to a value between fromMinutes and toMinutes.
  step?: number; // If specified will quantize the value to nearest step expressed in minutes. E.g., 15 to quantize to 15 minute increments, .5 to 30 second.
  labels:TimeLabel[];
  onChange:(minutes: number) => void;
}

function _clampMinutes(minutes:number, fromMinutes:number, toMinutes:number) {
  return Math.min(toMinutes, Math.max(fromMinutes, minutes));
}

function _minutesToPercent(minutes:number, fromMinutes:number, toMinutes:number) {
  const range = toMinutes - fromMinutes;
  if (range <= 0) return 0;
  return _clampMinutes((minutes - fromMinutes) / range * 100, 0, 100);
}

function _minutesToX(minutes:number, fromMinutes:number, toMinutes:number, width:number) {
  return _minutesToPercent(minutes, fromMinutes, toMinutes) / 100 * width;
}

function _percentToMinutes(percent:number, fromMinutes:number, toMinutes:number, step:number) {
  const range = toMinutes - fromMinutes;
  if (range <= 0) return fromMinutes;
  let minutes = fromMinutes + percent / 100 * range;
  if (step !== NO_QUANTIZING) minutes = fromMinutes + Math.round((minutes - fromMinutes) / step) * step;
  minutes = _clampMinutes(minutes, fromMinutes, toMinutes);
  return minutes;
}

function _formatMinutes(minutes:number) {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor(totalSeconds / 60) % 60;
  const secs = totalSeconds % 60;
  if (secs === 0) return `${hours}:${mins.toString().padStart(2, '0')}`;
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function _createPositionedLabels(labels:TimeLabel[], fromMinutes:number, toMinutes:number, sliderWidth:number):TimeLabel[] {
  return labels.map(label => ({
    ...label,
    minutes: _minutesToX(label.minutes, fromMinutes, toMinutes, sliderWidth)
  }));
}

function _renderTimeLabels(timeLabelPositions:TimeLabelPositions|null) {
  return timeLabelPositions?.labels.map(({ minutes:labelMinutes, label }, index) => {
    const position = timeLabelPositions.positions[index];
    if (position < 0) return null;
    return <span
      key={`${labelMinutes}-${label}`}
      className={styles.timeLabel}
      style={{left: `${position}px`}}
    >{label}</span>;
  });
}

function TimeSlider(props:Props) {
  const { fromMinutes, toMinutes, minutes, step = NO_QUANTIZING, labels, onChange } = props;
  const [displayMinutes, setDisplayMinutes] = useState(minutes);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [timeLabelPositions, setTimeLabelPositions] = useState<TimeLabelPositions|null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percent = _minutesToPercent(minutes, fromMinutes, toMinutes);

  function _onSliderUpdate(nextValue:number) {
    const nextMinutes = _percentToMinutes(nextValue, fromMinutes, toMinutes, step);
    setDisplayMinutes(nextMinutes);
    onChange(nextMinutes);
  }

  useEffect(() => {
    setDisplayMinutes(minutes);
  }, [minutes, setDisplayMinutes]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const updateWidth = () => setSliderWidth(slider.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(slider);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sliderWidth <= 0) return;
    const positionedLabels = _createPositionedLabels(labels, fromMinutes, toMinutes, sliderWidth);
    setTimeLabelPositions(calcTimeLabelPositions(positionedLabels, sliderWidth));
  }, [labels, sliderWidth, fromMinutes, toMinutes]);

  return (
    <div className={styles.container}>
      <div className={styles.slider} ref={sliderRef}>
        {_renderTimeLabels(timeLabelPositions)}
        <Slider
          value={percent}
          onUpdate={_onSliderUpdate}
        />
      </div>
      <div className={styles.timeText}>{_formatMinutes(displayMinutes)}</div>
    </div>
  );
}

export default TimeSlider;