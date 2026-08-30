/* This module groups character speech and thought bubble drawing helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import ScalingFactors from "@/game/types/ScalingFactors";
import { COLOR_BLACK, COLOR_DARK_GRAY, COLOR_SPEECH_BUBBLE_FILL } from "../drawColorConstants";

const BUBBLE_INTRO_DURATION_MSECS = 100;
const BUBBLE_INTRO_START_SCALE = 1.05;

type BubbleBox = Readonly<{
  left:number,
  top:number,
  width:number,
  height:number
}>;

type BubbleTarget = Readonly<{
  targetCanvasPoint:[number, number],
  interiorCanvasPoint:[number, number]
}>;

function _getEmitBubbleMetrics(scalingFactors:ScalingFactors):{ padding:number, fontSize:number, boxHeight:number } {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  return { padding, fontSize, boxHeight:fontSize + padding * 2 };
}

export function createEmitBubbleAnchorAtTopCenter(topCenterCanvasPoint:[number, number],
    scalingFactors:ScalingFactors):{ anchorX:number, anchorTopY:number } {
  const { boxHeight } = _getEmitBubbleMetrics(scalingFactors);
  return {
    anchorX:topCenterCanvasPoint[0],
    anchorTopY:topCenterCanvasPoint[1] + boxHeight + scalingFactors.roomLineWidth * 2
  };
}

function _findBubbleIntroScale(startTime:number, time:number):number {
  const elapsed = Math.max(0, time - startTime);
  const progress = clamp(elapsed / BUBBLE_INTRO_DURATION_MSECS, 0, 1);
  return 1 + (BUBBLE_INTRO_START_SCALE - 1) * (1 - progress);
}

function _createScaledBubbleBox(left:number, top:number, width:number, height:number, startTime:number, time:number):BubbleBox {
  const scale = _findBubbleIntroScale(startTime, time);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  return {
    left:left - (scaledWidth - width) / 2,
    top:top - (scaledHeight - height) / 2,
    width:scaledWidth,
    height:scaledHeight
  };
}

function _findBubbleBoxNearTarget(target:BubbleTarget, width:number, height:number, gap:number,
    context:CanvasRenderingContext2D):{ left:number, top:number } {
  const directionX = target.interiorCanvasPoint[0] < target.targetCanvasPoint[0] ? -1 : 1;
  const centerX = target.targetCanvasPoint[0] + directionX * (width / 2 + gap);
  return {
    left:Math.round(clamp(centerX - width / 2, 0, context.canvas.width - width)),
    top:Math.round(clamp(target.targetCanvasPoint[1] - height / 2, 0, context.canvas.height - height))
  };
}

function _drawSpeechBubbleOutline(left:number, top:number, width:number, height:number,
  tailTipX:number, tailTipY:number, hasHorizontalTail:boolean,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const tailBaseWidth = Math.max(4, scalingFactors.roomLineWidth * 2);
  const centerX = left + width / 2;
  const baseCenterX = clamp(tailTipX, left + tailBaseWidth, left + width - tailBaseWidth);
  const baseCenterY = clamp(tailTipY, top + tailBaseWidth, top + height - tailBaseWidth);
  const halfBaseWidth = tailBaseWidth / 2;
  const rightX = left + width;
  const bottomY = top + height;

  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(rightX, top);
  if (hasHorizontalTail && tailTipX > centerX) {
    context.lineTo(rightX, baseCenterY - halfBaseWidth);
    context.lineTo(tailTipX, tailTipY);
    context.lineTo(rightX, baseCenterY + halfBaseWidth);
  }
  context.lineTo(rightX, bottomY);
  if (!hasHorizontalTail) {
    context.lineTo(baseCenterX + halfBaseWidth, bottomY);
    context.lineTo(tailTipX, tailTipY);
    context.lineTo(baseCenterX - halfBaseWidth, bottomY);
  }
  context.lineTo(left, bottomY);
  if (hasHorizontalTail && tailTipX <= centerX) {
    context.lineTo(left, baseCenterY + halfBaseWidth);
    context.lineTo(tailTipX, tailTipY);
    context.lineTo(left, baseCenterY - halfBaseWidth);
  }
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
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, time:number) {
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
  const bubbleBox = _createScaledBubbleBox(left, top, boxWidth, boxHeight, startTime, time);
  const thoughtTrailCenterX = Math.round(clamp(anchorX, left + thoughtTrailRadius, left + boxWidth - thoughtTrailRadius));
  const thoughtTrailCenterY = top + boxHeight + thoughtTrailGap + thoughtTrailRadius;
  const smallerThoughtTrailCenterX = Math.round(clamp(anchorX, 0, context.canvas.width));
  const smallerThoughtTrailCenterY = thoughtTrailCenterY + thoughtTrailRadius + smallerThoughtTrailGap + smallerThoughtTrailRadius;
  const bubbleScale = bubbleBox.width / boxWidth;
  const scaledThoughtTrailRadius = thoughtTrailRadius * bubbleScale;
  const scaledSmallerThoughtTrailRadius = smallerThoughtTrailRadius * bubbleScale;

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);

  _drawRoundedBubbleOutline(bubbleBox.left, bubbleBox.top, bubbleBox.width, bubbleBox.height, cornerRadius * bubbleScale, context);
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(thoughtTrailCenterX, thoughtTrailCenterY, scaledThoughtTrailRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(smallerThoughtTrailCenterX, smallerThoughtTrailCenterY, scaledSmallerThoughtTrailRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

function _drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, time:number, target:BubbleTarget|null) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  const tailHeight = Math.max(4, scalingFactors.roomLineWidth * 2);

  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const boxWidth = context.measureText(speech).width + padding * 2;
  const targetedBox = target ? _findBubbleBoxNearTarget(target, boxWidth, boxHeight, tailHeight, context) : null;
  const left = targetedBox?.left
    ?? Math.round(clamp(anchorX - boxWidth / 2, 0, context.canvas.width - boxWidth));
  const top = targetedBox?.top
    ?? Math.round(clamp(anchorTopY - boxHeight - tailHeight - scalingFactors.roomLineWidth * 2,
      0, context.canvas.height - boxHeight - tailHeight));
  const bubbleBox = _createScaledBubbleBox(left, top, boxWidth, boxHeight, startTime, time);
  const tailTipX = target?.targetCanvasPoint[0] ?? Math.round(clamp(anchorX, 0, context.canvas.width));
  const tailTipY = target?.targetCanvasPoint[1] ?? bubbleBox.top + bubbleBox.height + tailHeight;

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  _drawSpeechBubbleOutline(bubbleBox.left, bubbleBox.top, bubbleBox.width, bubbleBox.height,
    tailTipX, tailTipY, target !== null, scalingFactors, context);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number,
    scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, time:number) {
  _drawSpeechBubble(speech, anchorX, anchorTopY, scalingFactors, context, startTime, time, null);
}

export function drawSpeechBubbleNearExit(speech:string, exitTargetCanvasPoint:[number, number],
    activeRoomInteriorCanvasPoint:[number, number], scalingFactors:ScalingFactors,
    context:CanvasRenderingContext2D, startTime:number, time:number) {
  _drawSpeechBubble(speech, 0, 0, scalingFactors, context, startTime, time,
    { targetCanvasPoint:exitTargetCanvasPoint, interiorCanvasPoint:activeRoomInteriorCanvasPoint });
}

function _drawEmitBubble(emitText:string, anchorX:number, anchorTopY:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, time:number, target:BubbleTarget|null) {
  const { padding, fontSize, boxHeight } = _getEmitBubbleMetrics(scalingFactors);

  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const boxWidth = context.measureText(emitText).width + padding * 2;
  const targetedBox = target ? _findBubbleBoxNearTarget(target, boxWidth, boxHeight, scalingFactors.roomLineWidth * 2, context) : null;
  const left = targetedBox?.left
    ?? Math.round(clamp(anchorX - boxWidth / 2, 0, context.canvas.width - boxWidth));
  const top = targetedBox?.top
    ?? Math.round(clamp(anchorTopY - boxHeight - scalingFactors.roomLineWidth * 2, 0, context.canvas.height - boxHeight));
  const bubbleBox = _createScaledBubbleBox(left, top, boxWidth, boxHeight, startTime, time);

  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  context.beginPath();
  context.rect(bubbleBox.left, bubbleBox.top, bubbleBox.width, bubbleBox.height);
  context.fill();
  context.stroke();

  context.fillStyle = COLOR_BLACK;
  context.fillText(emitText, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

export function drawEmitBubble(emitText:string, anchorX:number, anchorTopY:number,
    scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, startTime:number, time:number) {
  _drawEmitBubble(emitText, anchorX, anchorTopY, scalingFactors, context, startTime, time, null);
}

export function drawEmitBubbleNearExit(emitText:string, exitTargetCanvasPoint:[number, number],
    activeRoomInteriorCanvasPoint:[number, number], scalingFactors:ScalingFactors,
    context:CanvasRenderingContext2D, startTime:number, time:number) {
  _drawEmitBubble(emitText, 0, 0, scalingFactors, context, startTime, time,
    { targetCanvasPoint:exitTargetCanvasPoint, interiorCanvasPoint:activeRoomInteriorCanvasPoint });
}