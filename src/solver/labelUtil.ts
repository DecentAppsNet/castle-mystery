/* Shared label helper for the solver's ASCII renderings (see docs/adr-solver.md). Character names can
  be long enough to blow up a matrix, so they are capped at LABEL_MAX_WIDTH (the last character an
  ellipsis when shortened). The room-interaction cube and the item-access-cost table cap character
  names the same way, so they live here rather than being duplicated. */

const LABEL_MAX_WIDTH = 12;

export function truncateLabel(label:string, maxWidth:number = LABEL_MAX_WIDTH):string {
  return label.length <= maxWidth ? label : `${label.slice(0, maxWidth - 1)}…`;
}
