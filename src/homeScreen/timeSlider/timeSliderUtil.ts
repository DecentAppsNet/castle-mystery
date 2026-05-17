import TimeLabel from "@/game/types/TimeLabel";
import { HOURS_IN_DAY, SECS_IN_DAY, SECS_IN_HOUR, SECS_IN_MINUTE } from "@/common/timeUtil";

const HOURS_IN_HALF_DAY = HOURS_IN_DAY / 2;

function _clampMinutes(minutes:number, fromMinutes:number, toMinutes:number) {
  return Math.min(toMinutes, Math.max(fromMinutes, minutes));
}

export function minutesToPercent(minutes:number, fromMinutes:number, toMinutes:number) {
  const range = toMinutes - fromMinutes;
  if (range <= 0) return 0;
  return _clampMinutes((minutes - fromMinutes) / range * 100, 0, 100);
}

function _minutesToX(minutes:number, fromMinutes:number, toMinutes:number, width:number) {
  return minutesToPercent(minutes, fromMinutes, toMinutes) / 100 * width;
}

export function percentToMinutes(percent:number, fromMinutes:number, toMinutes:number, step:number) {
  const range = toMinutes - fromMinutes;
  if (range <= 0) return fromMinutes;
  let minutes = fromMinutes + percent / 100 * range;
  if (step >= 0) minutes = fromMinutes + Math.round((minutes - fromMinutes) / step) * step;
  minutes = _clampMinutes(minutes, fromMinutes, toMinutes);
  return minutes;
}

export function formatMinutes(minutes:number) {
  const totalSeconds = Math.round(minutes * SECS_IN_MINUTE);
  const wallClockSeconds = ((totalSeconds % SECS_IN_DAY) + SECS_IN_DAY) % SECS_IN_DAY;
  const hours24 = Math.floor(wallClockSeconds / SECS_IN_HOUR);
  const mins = Math.floor(wallClockSeconds / SECS_IN_MINUTE) % SECS_IN_MINUTE;
  const secs = wallClockSeconds % SECS_IN_MINUTE;
  const suffix = hours24 < HOURS_IN_HALF_DAY ? 'AM' : 'PM';
  const hours12 = hours24 % HOURS_IN_HALF_DAY === 0 ? HOURS_IN_HALF_DAY : hours24 % HOURS_IN_HALF_DAY;
  return `${hours12}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} ${suffix}`;
}

export function createPositionedLabels(labels:TimeLabel[], fromMinutes:number, toMinutes:number, sliderWidth:number):TimeLabel[] {
  return labels.map(label => ({
    ...label,
    minutes: _minutesToX(label.minutes, fromMinutes, toMinutes, sliderWidth)
  }));
}
