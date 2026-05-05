import TimeLabel from "@/game/types/TimeLabel";
import TimeLabelPositions from "./types/TimeLabelPositions";

const NUDGE_ALLOWANCE = 12;
const MIN_LABEL_GAP = 4;
const LABEL_CHAR_WIDTH = 7;
const LABEL_PADDING = 6;

function _estimateLabelWidth(label:string):number {
  return label.length * LABEL_CHAR_WIDTH + LABEL_PADDING;
}

function _calcIdealLeft(labelX:number, labelWidth:number, containerWidth:number, labelI:number, labelCount:number):number {
  if (labelI === 0) return 0;
  if (labelI === labelCount - 1) return Math.max(0, containerWidth - labelWidth);
  return labelX - labelWidth / 2;
}

/* Calculates a set of positions for displaying labels underneath the TimeSlider. When possible,
   the label should correspond to the minute position, but it can be nudged left or right by up to 
   NUDGE_ALLOWANCE units. If these constraints would not allow all labels to be displayed with overlap,
   positions can be set to -1 for as many labels as needed to indicate a label should be hidden.
*/
export function calcTimeLabelPositions(labels:TimeLabel[], containerWidth:number):TimeLabelPositions {
  const positions = labels.map(() => -1);
  let previousRight = -MIN_LABEL_GAP;

  for (let i = 0; i < labels.length; ++i) {
    const label = labels[i];
    const labelWidth = _estimateLabelWidth(label.label);
    const idealLeft = _calcIdealLeft(label.minutes, labelWidth, containerWidth, i, labels.length);
    const minLeft = Math.max(0, idealLeft - NUDGE_ALLOWANCE);
    const maxLeft = Math.min(containerWidth - labelWidth, idealLeft + NUDGE_ALLOWANCE);
    const requiredLeft = previousRight + MIN_LABEL_GAP;
    const left = Math.max(requiredLeft, Math.max(minLeft, Math.min(idealLeft, maxLeft)));

    if (left > maxLeft || left + labelWidth > containerWidth) {
      positions[i] = -1;
      continue;
    }

    positions[i] = left;
    previousRight = left + labelWidth;
  }

  return {
    containerWidth,
    labels,
    positions
  };
}