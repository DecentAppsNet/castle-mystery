/* This module groups character-focused drawing helpers, including visible character rendering and character popovers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import Character from "../types/Character";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import { COLOR_ACTIVE_CHARACTER_HIGHLIGHT, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_SPEECH_BUBBLE_FILL } from "./drawConstants";
import { drawTextPopover } from "./popoverDrawUtil";

const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.2;
const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;
const CHARACTER_WIDTH_SCALE = 3.75;
const CHARACTER_HEIGHT_SCALE = 7.5;
const LAYING_HORIZONTAL_SPREAD_SCALE = 2.18;
const LAYING_HEAD_RADIUS_SCALE = 1.2;
const SITTING_BODY_LENGTH_SCALE = 0.7;
const SITTING_LEG_LENGTH_SCALE = 0.52;
const SITTING_TRAILING_LEG_LENGTH_SCALE = 0.32;

type HeadLayout = {
  centerX:number,
  centerY:number,
  radius:number
}

type StrokeSegment = {
  fromX:number,
  fromY:number,
  toX:number,
  toY:number
}

type CharacterLayout = {
  head:HeadLayout,
  segments:StrokeSegment[],
  topY:number,
  bottomY:number
}

function _getCharacterCanvasBottomPosition(character:Character, scalingFactors:ScalingFactors):[number, number] {
  const [baseX, baseY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const depth = clamp(character.depth, 0, 1);
  return [baseX + offsetX * depth, baseY + offsetY * depth];
}

function _getCharacterDisplayName(character:Character):string {
  return character.title;
}

function _getCharacterCarryText(character:Character):string {
  const itemCount = character.items.length;
  if (itemCount === 0) return "Carrying nothing.";
  if (itemCount === 1) return "Carrying 1 item.";
  return `Carrying ${itemCount} items.`;
}

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

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
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

export function getCharacterSpeechAnchor(character:Character, scalingFactors:ScalingFactors, time:number) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = _getCharacterCanvasBottomPosition(character, scalingFactors);
  const characterWidth = roomLineWidth * CHARACTER_WIDTH_SCALE;
  const characterHeight = roomLineWidth * CHARACTER_HEIGHT_SCALE;
  const provisionalLayout = _createCharacterLayout(0, 0, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation);
  const centerY = Math.round(bottomY - provisionalLayout.bottomY);
  const swayPhase = ((time + character.randomSalt * CHARACTER_SWAY_INTERVAL) % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = character.isAlive ? Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT : 0;
  const anchorX = centerX + sway;
  const anchorTopY = Math.round(centerY + provisionalLayout.topY);
  return { anchorX, anchorTopY, centerX, centerY, characterWidth, characterHeight:provisionalLayout.bottomY - provisionalLayout.topY };
}

function _createCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection'], bodyOrientation:Character['bodyOrientation']):CharacterLayout {
  if (bodyOrientation === 'laying') return _createLayingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  if (bodyOrientation === 'sitting') return _createSittingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  return _createStandingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
}

function _drawActiveCharacterHighlight(centerX:number, centerY:number, characterWidth:number, characterHeight:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  const baseRadius = Math.hypot(characterWidth / 2, characterHeight / 2) / 2 + scalingFactors.roomLineWidth;
  const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS;
  const pulse = phase <= 0.5 ? phase * 2 : 2 * (1 - phase);
  const radius = baseRadius * (1 + (PULSE_SCALE_PEAK - 1) * pulse);
  context.fillStyle = COLOR_ACTIVE_CHARACTER_HIGHLIGHT;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
}

function _createLayout(head:HeadLayout, segments:StrokeSegment[]):CharacterLayout {
  const segmentYs = segments.flatMap(segment => [segment.fromY, segment.toY]);
  return {
    head,
    segments,
    topY:Math.min(head.centerY - head.radius, ...segmentYs),
    bottomY:Math.max(head.centerY + head.radius, ...segmentYs)
  };
}

function _getLayoutHorizontalBounds(layout:CharacterLayout):{ leftX:number, rightX:number } {
  const segmentXs = layout.segments.flatMap(segment => [segment.fromX, segment.toX]);
  return {
    leftX:Math.min(layout.head.centerX - layout.head.radius, ...segmentXs),
    rightX:Math.max(layout.head.centerX + layout.head.radius, ...segmentXs)
  };
}

function _translateLayout(layout:CharacterLayout, deltaX:number):CharacterLayout {
  return _createLayout(
    {
      centerX:layout.head.centerX + deltaX,
      centerY:layout.head.centerY,
      radius:layout.head.radius
    },
    layout.segments.map(segment => ({
      fromX:segment.fromX + deltaX,
      fromY:segment.fromY,
      toX:segment.toX + deltaX,
      toY:segment.toY
    }))
  );
}

function _scaleLayoutX(layout:CharacterLayout, pivotX:number, scale:number):CharacterLayout {
  return _createLayout(
    {
      centerX:pivotX + (layout.head.centerX - pivotX) * scale,
      centerY:layout.head.centerY,
      radius:layout.head.radius
    },
    layout.segments.map(segment => ({
      fromX:pivotX + (segment.fromX - pivotX) * scale,
      fromY:segment.fromY,
      toX:pivotX + (segment.toX - pivotX) * scale,
      toY:segment.toY
    }))
  );
}

function _createStandingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const facingSign = facingDirection === 'right' ? 1 : -1;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const headCenterY = centerY - characterHeight / 4;
  const shoulderY = centerY;
  const hipY = centerY + characterHeight / 4;
  const leadingArmX = backboneX + facingSign * characterWidth / 2;
  const trailingArmX = backboneX - facingSign * characterWidth / 4;
  const leadingArmY = centerY + characterHeight / 8;
  const trailingArmY = centerY + characterHeight / 16;
  const leadingFootX = backboneX + facingSign * characterWidth / 2;
  const trailingFootX = backboneX - facingSign * characterWidth / 8;
  const footY = centerY + characterHeight / 2;

  return _createLayout(
    { centerX:backboneX, centerY:headCenterY, radius:headRadius },
    [
      { fromX:backboneX, fromY:headCenterY + headRadius, toX:backboneX, toY:hipY },
      { fromX:backboneX, fromY:shoulderY, toX:trailingArmX, toY:trailingArmY },
      { fromX:backboneX, fromY:shoulderY, toX:leadingArmX, toY:leadingArmY },
      { fromX:backboneX, fromY:hipY, toX:trailingFootX, toY:footY },
      { fromX:backboneX, fromY:hipY, toX:leadingFootX, toY:footY }
    ]
  );
}

function _createSittingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const facingSign = facingDirection === 'right' ? 1 : -1;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const standingHeadCenterY = centerY - characterHeight / 4;
  const standingBodyTopY = standingHeadCenterY + headRadius;
  const hipY = centerY + characterHeight / 4;
  const standingShoulderY = centerY;
  const standingLeadingArmY = centerY + characterHeight / 8;
  const standingTrailingArmY = centerY + characterHeight / 16;
  const standingBodyLength = hipY - standingBodyTopY;
  const bodyLength = standingBodyLength * SITTING_BODY_LENGTH_SCALE;
  const bodyTopY = hipY - bodyLength;
  const shoulderOffsetRatio = (standingShoulderY - standingBodyTopY) / standingBodyLength;
  const leadingArmOffsetRatio = (standingLeadingArmY - standingShoulderY) / standingBodyLength;
  const trailingArmOffsetRatio = (standingTrailingArmY - standingShoulderY) / standingBodyLength;
  const headCenterY = bodyTopY - headRadius;
  const shoulderY = bodyTopY + bodyLength * shoulderOffsetRatio;
  const leadingArmX = backboneX + facingSign * characterWidth / 2;
  const trailingArmX = backboneX - facingSign * characterWidth / 4;
  const leadingArmY = shoulderY + bodyLength * leadingArmOffsetRatio;
  const trailingArmY = shoulderY + bodyLength * trailingArmOffsetRatio;
  const footY = centerY + characterHeight / 2;
  const leadingFootX = backboneX + facingSign * characterWidth * SITTING_LEG_LENGTH_SCALE;
  const trailingFootX = backboneX + facingSign * characterWidth * SITTING_TRAILING_LEG_LENGTH_SCALE;

  return _createLayout(
    { centerX:backboneX, centerY:headCenterY, radius:headRadius },
    [
      { fromX:backboneX, fromY:headCenterY + headRadius, toX:backboneX, toY:hipY },
      { fromX:backboneX, fromY:shoulderY, toX:trailingArmX, toY:trailingArmY },
      { fromX:backboneX, fromY:shoulderY, toX:leadingArmX, toY:leadingArmY },
      { fromX:backboneX, fromY:hipY, toX:backboneX, toY:footY },
      { fromX:backboneX, fromY:footY, toX:trailingFootX, toY:footY },
      { fromX:backboneX, fromY:footY, toX:leadingFootX, toY:footY }
    ]
  );
}

function _rotatePointQuarterTurn(x:number, y:number, pivotX:number, pivotY:number, direction:'clockwise'|'counterclockwise') {
  const relativeX = x - pivotX;
  const relativeY = y - pivotY;
  return direction === 'clockwise'
    ? { x:pivotX + relativeY, y:pivotY - relativeX }
    : { x:pivotX - relativeY, y:pivotY + relativeX };
}

function _createLayingCharacterLayout(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection']):CharacterLayout {
  const standingLayout = _createStandingCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection);
  const rotationDirection = facingDirection === 'right' ? 'clockwise' : 'counterclockwise';
  const rotatedHeadCenter = _rotatePointQuarterTurn(standingLayout.head.centerX, standingLayout.head.centerY, backboneX, centerY, rotationDirection);

  const rotatedLayout = _createLayout(
    {
      centerX:rotatedHeadCenter.x,
      centerY:rotatedHeadCenter.y,
      radius:standingLayout.head.radius * LAYING_HEAD_RADIUS_SCALE
    },
    standingLayout.segments.map(segment => {
      const from = _rotatePointQuarterTurn(segment.fromX, segment.fromY, backboneX, centerY, rotationDirection);
      const to = _rotatePointQuarterTurn(segment.toX, segment.toY, backboneX, centerY, rotationDirection);
      return { fromX:from.x, fromY:from.y, toX:to.x, toY:to.y };
    })
  );

  const widenedLayout = _scaleLayoutX(rotatedLayout, backboneX, LAYING_HORIZONTAL_SPREAD_SCALE);
  const { leftX, rightX } = _getLayoutHorizontalBounds(widenedLayout);
  const layoutCenterX = (leftX + rightX) / 2;
  return _translateLayout(widenedLayout, backboneX - layoutCenterX);
}

function _drawCharacterBody(backboneX:number, centerY:number, characterWidth:number, characterHeight:number,
  facingDirection:Character['facingDirection'], bodyOrientation:Character['bodyOrientation'], context:CanvasRenderingContext2D):CharacterLayout {
  const layout = _createCharacterLayout(backboneX, centerY, characterWidth, characterHeight, facingDirection, bodyOrientation);
  context.beginPath();
  layout.segments.forEach(segment => {
    context.moveTo(segment.fromX, segment.fromY);
    context.lineTo(segment.toX, segment.toY);
  });
  return layout;
}

export function drawObscuredActiveCharacter(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [roomLeft] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [roomRight, roomBottom] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const centerX = roomLeft + (roomRight - roomLeft) / 2;
  const characterWidth = scalingFactors.roomLineWidth * CHARACTER_WIDTH_SCALE;
  const characterHeight = scalingFactors.roomLineWidth * CHARACTER_HEIGHT_SCALE;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const bottomY = roomBottom - scalingFactors.roomLineWidth;
  const centerY = bottomY - characterHeight / 2;
  const backboneX = centerX;

  context.save();
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = "#fff";
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(backboneX, centerY - characterHeight / 4 + headRadius);
  context.lineTo(backboneX, centerY + characterHeight / 4);
  context.moveTo(backboneX, centerY);
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 8);
  context.moveTo(backboneX, centerY);
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 8);
  context.moveTo(backboneX, centerY + characterHeight / 4);
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 2);
  context.moveTo(backboneX, centerY + characterHeight / 4);
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 2);
  context.stroke();
  context.beginPath();
  context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function drawCharacter(character:Character, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, isActive:boolean) {
  const { anchorX:backboneX, centerX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(character, scalingFactors, time);
  const faceImage = character.faceImageUrl ? imageSet.get(character.faceImageUrl) || null : null;
  if (isActive) _drawActiveCharacterHighlight(centerX, centerY, characterWidth, characterHeight, scalingFactors, context, time);
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
  const layout = _drawCharacterBody(backboneX, centerY, characterWidth, characterHeight, character.facingDirection, character.bodyOrientation, context);
  const headRadius = layout.head.radius;
  if (!faceImage) {
    context.moveTo(layout.head.centerX + headRadius, layout.head.centerY);
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    return;
  }
  context.stroke();

  const faceImageWidth = faceImage.width;
  const faceImageHeight = faceImage.height;
  if (!faceImageWidth || !faceImageHeight) {
    context.beginPath();
    context.arc(layout.head.centerX, layout.head.centerY, headRadius, 0, Math.PI * 2);
    context.stroke();
    return;
  }
  const maxFaceWidth = headRadius * 6;
  const maxFaceHeight = headRadius * 6;
  const faceScale = Math.min(maxFaceWidth / faceImageWidth, maxFaceHeight / faceImageHeight);
  const drawWidth = faceImageWidth * faceScale;
  const drawHeight = faceImageHeight * faceScale;
  if (character.bodyOrientation !== 'laying') {
    const drawX = layout.head.centerX - drawWidth / 2;
    const drawY = layout.head.centerY - drawHeight / 2;
    context.drawImage(faceImage, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  context.save();
  context.translate(layout.head.centerX, layout.head.centerY);
  context.rotate(character.facingDirection === 'right' ? -Math.PI / 2 : Math.PI / 2);
  context.drawImage(faceImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const title = character.isTitleKnown ? _getCharacterDisplayName(character) : "";
  const carryText = _getCharacterCarryText(character);
  drawTextPopover({ anchorX, anchorY, title, bodyTexts:[character.description, carryText], scalingFactors, context });
}
