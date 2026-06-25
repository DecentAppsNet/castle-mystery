import styles from "./TimeSlider.module.css";

import Slider from "@/components/slider/Slider";
import PlayPauseButton from "@/components/playPauseButton/PlayPauseButton";
import { useEffect, useMemo, useRef, useState } from "react";
import { calcTimeLabelPositions } from "./labelUtil";
import { createPositionedLabels, formatMinutes, minutesToPercent, percentToMinutes } from "./timeSliderUtil";
import TimeLabel from "@/game/types/TimeLabel";
import TimeLabelPositions from "./types/TimeLabelPositions";
import Itinerary from "@/game/types/Itinerary";
import Character from "@/game/types/Character";
import Room from "@/game/types/Room";
import { createItineraryMarkerModel } from "./itineraryMarkerUtil";
import { COLOR_BLACK, COLOR_SPEECH_BUBBLE_FILL } from "@/game/drawing/drawColorConstants";

const NO_QUANTIZING = -1;

type Props = {
  fromMinutes:number; // Minimum value in minutes for when slider thumb is at leftmost position.
  toMinutes:number; // Maximum value in minutes for when slider thumb is at rightmost position.
  minutes: number; // Affects position of the slider thumb. Clamped to a value between fromMinutes and toMinutes.
  step?: number; // If specified will quantize the value to nearest step expressed in minutes. E.g., 15 to quantize to 15 minute increments, .5 to 30 second.
  itinerary:Itinerary|null;
  characters:Character[];
  rooms:Room[];
  roomsRevision?:number;
  initialRoomId:string|null;
  labels:TimeLabel[];
  isPlaying:boolean;
  isPlayPauseDisabled?:boolean;
  onChange:(minutes: number) => void;
  onPlayPauseChange:(isPlaying:boolean) => void;
  onScrubbingChange?:(isScrubbing:boolean) => void;
}

function _msecsToMinutes(msecs:number):number {
  return msecs / 60_000;
}

function _renderEncounterMarker(left:number, key:string) {
  return <span key={key} className={styles.encounterMarker} style={{left: `${left}px`}}>
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
      <circle cx="5" cy="2" r="1.5" fill={COLOR_BLACK} />
      <path d="M5 3.8 L5 7.2 M2.5 5.2 L7.5 5.2 M5 7.2 L2.8 10.5 M5 7.2 L7.2 10.5" stroke={COLOR_BLACK} strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  </span>;
}

function _renderItineraryMarkers(sliderWidth:number, fromMinutes:number, toMinutes:number,
  itinerary:Itinerary|null, characters:Character[], rooms:Room[], initialRoomId:string|null) {
  const durationMsecs = toMinutes * 60_000;
  const markerModel = createItineraryMarkerModel(itinerary, rooms, initialRoomId, durationMsecs, characters);
  const toLeft = (time:number) => minutesToPercent(_msecsToMinutes(time), fromMinutes, toMinutes) / 100 * sliderWidth;

  return <div className={styles.markerLayer}>
    {markerModel.obscuredRanges.map((range, index) => {
      const left = toLeft(range.startTime);
      const right = toLeft(range.endTime);
      return <span
        key={`obscured-${index}-${range.startTime}`}
        className={styles.obscuredMarker}
        style={{ left: `${left}px`, width: `${Math.max(0, right - left)}px`, backgroundColor: COLOR_BLACK }}
      />;
    })}
    {markerModel.speechRanges.map((range, index) => {
      const left = toLeft(range.startTime);
      const right = toLeft(range.endTime);
      return <span
        key={`speech-${index}-${range.startTime}`}
        className={styles.speechMarker}
        style={{ left: `${left}px`, width: `${Math.max(3, right - left)}px`, backgroundColor: COLOR_SPEECH_BUBBLE_FILL, borderColor: COLOR_BLACK }}
      />;
    })}
    {markerModel.roomEntryTimes.map((time, index) =>
      <span key={`room-entry-${index}-${time}`} className={styles.roomEntryMarker} style={{left: `${toLeft(time)}px`}} />
    )}
    {markerModel.encounterMarkers.map((marker, index) => _renderEncounterMarker(toLeft(marker.startTime), `encounter-${index}-${marker.startTime}`))}
  </div>;
}

function _renderTimeLabels(timeLabelPositions:TimeLabelPositions|null) {
  return timeLabelPositions?.labels.map(({ minutes:labelMinutes, label }, index) => {
    const position = timeLabelPositions.positions[index];
    if (position < 0) return null;
    return <span
      key={`${index}-${labelMinutes}-${label}`}
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
    itinerary,
    characters,
    rooms,
    roomsRevision = 0,
    initialRoomId,
    labels,
    isPlaying,
    isPlayPauseDisabled,
    onChange,
    onPlayPauseChange,
    onScrubbingChange
  } = props;
  const [displayMinutes, setDisplayMinutes] = useState(minutes);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [timeLabelPositions, setTimeLabelPositions] = useState<TimeLabelPositions|null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percent = minutesToPercent(minutes, fromMinutes, toMinutes);
  const itineraryMarkers = useMemo(
    () => _renderItineraryMarkers(sliderWidth, fromMinutes, toMinutes, itinerary, characters, rooms, initialRoomId),
    [sliderWidth, fromMinutes, toMinutes, itinerary, characters, rooms, roomsRevision, initialRoomId]
  );

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
        {itineraryMarkers}
        <Slider
          value={percent}
          onUpdate={_onSliderUpdate}
          onDraggingChange={onScrubbingChange}
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