/* This module groups character-focused drawing helpers, including visible character rendering and character popovers. */

import { clamp } from "@/common/numberUtil";
import { processCharacterEffects } from "../effects/effectUtil";
import { gameToCanvasPosition } from "./drawUtil";
import Character from "../types/Character";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import { COLOR_ACTIVE_CHARACTER_HIGHLIGHT, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_SPEECH_BUBBLE_FILL } from "./drawConstants";
import { drawTextPopover } from "./popoverDrawUtil";

const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.2;
const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;

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
  const [centerX, bottomY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const swayPhase = ((time + character.randomSalt * CHARACTER_SWAY_INTERVAL) % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT;
  const anchorX = centerX + sway;
  const anchorTopY = centerY - characterHeight / 2;
  return { anchorX, anchorTopY, centerX, centerY, characterWidth, characterHeight };
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

export function drawObscuredActiveCharacter(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [roomLeft, roomTop] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [roomRight, roomBottom] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const centerX = roomLeft + (roomRight - roomLeft) / 2;
  const roomCenterY = roomTop + (roomBottom - roomTop) / 2;
  const characterWidth = scalingFactors.roomLineWidth * 5;
  const characterHeight = scalingFactors.roomLineWidth * 10;
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const minCenterY = roomTop + characterHeight / 2 + scalingFactors.roomLineWidth;
  const maxCenterY = roomBottom - characterHeight / 2 - scalingFactors.roomLineWidth;
  const centerY = clamp(roomCenterY + scalingFactors.roomFontHeight * 1.3, minCenterY, maxCenterY);
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

function drawCharacter(character:Character, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, imageSet:ImageSet, isActive:boolean) {
  const { anchorX:backboneX, centerX, centerY, characterWidth, characterHeight } = getCharacterSpeechAnchor(character, scalingFactors, time);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const faceImage = character.faceImageUrl ? imageSet.get(character.faceImageUrl) || null : null;
  if (isActive) _drawActiveCharacterHighlight(centerX, centerY, characterWidth, characterHeight, scalingFactors, context, time);
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
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
  if (!faceImage) {
    context.moveTo(backboneX + headRadius, centerY - characterHeight / 4);
    context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, Math.PI * 2);
    context.stroke();
    return;
  }
  context.stroke();

  const faceImageWidth = faceImage.width;
  const faceImageHeight = faceImage.height;
  if (!faceImageWidth || !faceImageHeight) {
    context.beginPath();
    context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, Math.PI * 2);
    context.stroke();
    return;
  }
  const maxFaceWidth = headRadius * 6;
  const maxFaceHeight = headRadius * 6;
  const faceScale = Math.min(maxFaceWidth / faceImageWidth, maxFaceHeight / faceImageHeight);
  const drawWidth = faceImageWidth * faceScale;
  const drawHeight = faceImageHeight * faceScale;
  const drawX = backboneX - drawWidth / 2;
  const drawY = centerY - drawHeight;
  context.drawImage(faceImage, drawX, drawY, drawWidth, drawHeight);
}

export function drawVisibleCharactersInRoom(charactersInRoom:Character[], activeCharacter:Character,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, imageSet:ImageSet) {
  const charactersInDrawOrder = [...charactersInRoom].sort((character1, character2) => character1.y - character2.y);
  charactersInDrawOrder.forEach(character => {
    drawCharacter(character, scalingFactors, context, time, imageSet, character.id === activeCharacter.id);
    processCharacterEffects(character, effects, context);
  });
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const title = character.isTitleKnown ? _getCharacterDisplayName(character) : "";
  const carryText = _getCharacterCarryText(character);
  drawTextPopover({ anchorX, anchorY, title, bodyTexts:[character.description, carryText], scalingFactors, context });
}
