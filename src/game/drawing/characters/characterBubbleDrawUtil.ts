/* This module groups character speech and thought bubble drawing helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import ScalingFactors from "@/game/types/ScalingFactors";
import { COLOR_BLACK, COLOR_DARK_GRAY, COLOR_SPEECH_BUBBLE_FILL } from "../drawColorConstants";

function _drawSpeechBubbleOutline(left:number, top:number, width:number, height:number,
  tailTipX:number, tailTipY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const tailBaseWidth = Math.max(4, scalingFactors.roomLineWidth * 2);
  const tailBaseCenterX = clamp(tailTipX, left + tailBaseWidth, left + width - tailBaseWidth);
  const tailBaseLeftX = tailBaseCenterX - tailBaseWidth / 2;
  const tailBaseRightX = tailBaseCenterX + tailBaseWidth / 2;
  const bottomY = top + height;

  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left + width, top);
  context.lineTo(left + width, bottomY);
  context.lineTo(tailBaseRightX, bottomY);
  context.lineTo(tailTipX, tailTipY);
  context.lineTo(tailBaseLeftX, bottomY);
  context.lineTo(left, bottomY);
  context.closePath();
}

function _drawRoundedBubbleOutline(left:number, top:number, width:number, height:number,
  cornerRadius:number, context:CanvasRenderingContext2D) {
  const right = left + width;
  const bottom = top + height;

  context.beginPath();
  context.moveTo(left + cornerRadius, top);
  context.lineTo(right - cornerRadius, top);
  context.quadraticCurveTo(right, top, right, top + cornerRadius);
  context.lineTo(right, bottom - cornerRadius);
  context.quadraticCurveTo(right, bottom, right - cornerRadius, bottom);
  context.lineTo(left + cornerRadius, bottom);
  context.quadraticCurveTo(left, bottom, left, bottom - cornerRadius);
  context.lineTo(left, top + cornerRadius);
  context.quadraticCurveTo(left, top, left + cornerRadius, top);
  context.closePath();
}

export function drawThoughtBubble(speech:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  const thoughtTrailRadius = Math.max(1.5, scalingFactors.roomLineWidth * 0.75);
  const smallerThoughtTrailRadius = Math.max(1, thoughtTrailRadius * 0.55);
  const thoughtTrailGap = Math.max(1.5, scalingFactors.roomLineWidth * 0.75);
  const smallerThoughtTrailGap = Math.max(1, scalingFactors.roomLineWidth * 0.5);
  const extraBottomSpace = thoughtTrailGap + thoughtTrailRadius * 2 + smallerThoughtTrailGap + smallerThoughtTrailRadius * 2;
  const cornerRadius = Math.min(boxHeight / 2, Math.max(6, scalingFactors.roomLineWidth * 3));

  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const boxWidth = context.measureText(speech).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - extraBottomSpace - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, 0, context.canvas.width - boxWidth));
  const top = Math.round(clamp(unclampedTop, 0, context.canvas.height - boxHeight - extraBottomSpace));
  const thoughtTrailCenterX = Math.round(clamp(anchorX, left + thoughtTrailRadius, left + boxWidth - thoughtTrailRadius));
  const thoughtTrailCenterY = top + boxHeight + thoughtTrailGap + thoughtTrailRadius;
  const smallerThoughtTrailCenterX = Math.round(clamp(anchorX, 0, context.canvas.width));
  const smallerThoughtTrailCenterY = thoughtTrailCenterY + thoughtTrailRadius + smallerThoughtTrailGap + smallerThoughtTrailRadius;

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);

  _drawRoundedBubbleOutline(left, top, boxWidth, boxHeight, cornerRadius, context);
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(thoughtTrailCenterX, thoughtTrailCenterY, thoughtTrailRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(smallerThoughtTrailCenterX, smallerThoughtTrailCenterY, smallerThoughtTrailRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  const tailHeight = Math.max(4, scalingFactors.roomLineWidth * 2);

  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const boxWidth = context.measureText(speech).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - tailHeight - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, 0, context.canvas.width - boxWidth));
  const top = Math.round(clamp(unclampedTop, 0, context.canvas.height - boxHeight - tailHeight));
  const tailTipX = Math.round(clamp(anchorX, 0, context.canvas.width));
  const tailTipY = top + boxHeight + tailHeight;

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  _drawSpeechBubbleOutline(left, top, boxWidth, boxHeight, tailTipX, tailTipY, scalingFactors, context);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

export function drawEmitBubble(emitText:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;

  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const boxWidth = context.measureText(emitText).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, 0, context.canvas.width - boxWidth));
  const top = Math.round(clamp(unclampedTop, 0, context.canvas.height - boxHeight));

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  context.beginPath();
  context.rect(left, top, boxWidth, boxHeight);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(emitText, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}