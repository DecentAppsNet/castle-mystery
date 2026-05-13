import TimeLabel from "@/game/types/TimeLabel";

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
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor(totalSeconds / 60) % 60;
  const secs = totalSeconds % 60;
  if (secs === 0) return `${hours}:${mins.toString().padStart(2, '0')}`;
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function createPositionedLabels(labels:TimeLabel[], fromMinutes:number, toMinutes:number, sliderWidth:number):TimeLabel[] {
  return labels.map(label => ({
    ...label,
    minutes: _minutesToX(label.minutes, fromMinutes, toMinutes, sliderWidth)
  }));
}
