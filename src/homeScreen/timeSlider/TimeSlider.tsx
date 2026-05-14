import styles from "./TimeSlider.module.css";

import Slider from "@/components/slider/Slider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { useEffect, useRef, useState } from "react";
import { calcTimeLabelPositions } from "./labelUtil";
import { createPositionedLabels, formatMinutes, minutesToPercent, percentToMinutes } from "./timeSliderUtil";
import TimeLabel from "@/game/types/TimeLabel";
import TimeLabelPositions from "./types/TimeLabelPositions";

const NO_QUANTIZING = -1;

type Props = {
  fromMinutes:number; // Minimum value in minutes for when slider thumb is at leftmost position.
  toMinutes:number; // Maximum value in minutes for when slider thumb is at rightmost position.
  minutes: number; // Affects position of the slider thumb. Clamped to a value between fromMinutes and toMinutes.
  step?: number; // If specified will quantize the value to nearest step expressed in minutes. E.g., 15 to quantize to 15 minute increments, .5 to 30 second.
  labels:TimeLabel[];
  isPlaying:boolean;
  isPlayPauseDisabled?:boolean;
  onChange:(minutes: number) => void;
  onPlayPauseChange:(isPlaying:boolean) => void;
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
  const {
    fromMinutes,
    toMinutes,
    minutes,
    step = NO_QUANTIZING,
    labels,
    isPlaying,
    isPlayPauseDisabled,
    onChange,
    onPlayPauseChange
  } = props;
  const [displayMinutes, setDisplayMinutes] = useState(minutes);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [timeLabelPositions, setTimeLabelPositions] = useState<TimeLabelPositions|null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percent = minutesToPercent(minutes, fromMinutes, toMinutes);

  function _onSliderUpdate(nextValue:number) {
    const nextMinutes = percentToMinutes(nextValue, fromMinutes, toMinutes, step);
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
    const positionedLabels = createPositionedLabels(labels, fromMinutes, toMinutes, sliderWidth);
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
      <div className={styles.playPauseButton}>
        <PlayPauseButton
          isPlaying={isPlaying}
          disabled={isPlayPauseDisabled}
          onChange={onPlayPauseChange}
        />
      </div>
      <div className={styles.timeText}>{formatMinutes(displayMinutes)}</div>
    </div>
  );
}

export default TimeSlider;