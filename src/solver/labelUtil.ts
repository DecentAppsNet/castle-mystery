/* Shared helpers for the solver's ASCII renderings (see docs/adr-solver.md). Character names can be
  long enough to blow up a matrix, so they are hard-capped at LABEL_MAX_WIDTH — truncated with no
  marker. Times are rendered as zero-padded HH:MM. The room-interaction cube and the item-access-cost
  table share both helpers, so they live here rather than being duplicated. */

const LABEL_MAX_WIDTH = 12;

export function truncateLabel(label:string, maxWidth:number = LABEL_MAX_WIDTH):string {
  return label.length <= maxWidth ? label : label.slice(0, maxWidth);
}

export function formatHoursMinutes(msecs:number):string {
  const totalMinutes = Math.floor(msecs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Seconds-precision HH:MM:SS, for renderings where sub-minute differences matter (e.g. anachronism
// overlaps, which can be a second or two). formatHoursMinutes() above stays the default for the wider
// matrix/cube cells, where the extra columns would not fit.
export function formatHoursMinutesSeconds(msecs:number):string {
  const totalSeconds = Math.floor(msecs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
