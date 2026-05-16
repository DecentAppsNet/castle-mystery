/* This module groups character-focused drawing helpers, including visible character rendering and character popovers. */

import { clamp } from "@/common/numberUtil";
import { processCharacterEffects } from "../effects/effectUtil";
import { gameToCanvasPosition } from "./drawUtil";
import Character from "../types/Character";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "../effects/types/Effect";
import ImageSet from "../types/ImageSet";
import { COLOR_ACTIVE_CHARACTER_HIGHLIGHT, COLOR_BLACK, COLOR_DARK_GRAY, COLOR_POPOVER_FILL, COLOR_SPEECH_BUBBLE_FILL } from "./drawConstants";

const PULSE_CADENCE_MS = 1000;
const PULSE_SCALE_PEAK = 1.2;
const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;

function _wrapText(context:CanvasRenderingContext2D, text:string, maxWidth:number):string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines:string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; ++i) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (context.measureText(nextLine).width <= maxWidth) currentLine = nextLine;
    else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
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

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const boxWidth = context.measureText(speech).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, 0, context.canvas.width - boxWidth));
  const top = Math.round(clamp(unclampedTop, 0, context.canvas.height - boxHeight));
  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  context.fillRect(left, top, boxWidth, boxHeight);
  context.strokeRect(left, top, boxWidth, boxHeight);
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
  const canvasLeft = 0;
  const canvasTop = 0;
  const canvasRight = context.canvas.width;
  const canvasBottom = context.canvas.height;
  const title = character.isTitleKnown ? _getCharacterDisplayName(character) : "";
  const carryText = _getCharacterCarryText(character);
  const titleFontSize = Math.max(20, Math.round(scalingFactors.roomFontHeight * 1.4));
  const bodyFontSize = Math.max(16, Math.round(scalingFactors.roomFontHeight * 1.0));
  const padding = Math.max(6, scalingFactors.roomLineWidth * 2);
  const lineGap = Math.max(3, scalingFactors.roomLineWidth);
  const maxTextWidth = Math.min(280, Math.max(140, canvasRight * 0.3));
  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = `${bodyFontSize}px Jellee`;
  const descriptionLines = _wrapText(context, character.description, maxTextWidth);
  const carryLines = _wrapText(context, carryText, maxTextWidth);
  const bodyLines = [...descriptionLines, "", ...carryLines];
  const bodyWidth = bodyLines.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0);
  context.font = `${titleFontSize}px Jellee`;
  const titleWidth = title ? context.measureText(title).width : 0;
  const boxWidth = Math.max(titleWidth, bodyWidth) + padding * 2;
  const titleHeight = title ? titleFontSize : 0;
  const bodyHeight = bodyLines.length * bodyFontSize + Math.max(0, bodyLines.length - 1) * lineGap;
  const titleSectionHeight = title ? titleHeight + lineGap : 0;
  const boxHeight = padding * 2 + titleSectionHeight + bodyHeight;
  const desiredLeft = anchorX + scalingFactors.roomLineWidth * 2;
  const desiredTop = anchorY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = clamp(desiredLeft, canvasLeft, canvasRight - boxWidth);
  const top = clamp(desiredTop, canvasTop, canvasBottom - boxHeight);
  context.fillStyle = COLOR_POPOVER_FILL;
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth);
  context.fillRect(left, top, boxWidth, boxHeight);
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.fillStyle = COLOR_BLACK;
  if (title) {
    context.font = `${titleFontSize}px Jellee`;
    context.fillText(title, left + padding, top + padding);
  }
  context.font = `${bodyFontSize}px Jellee`;
  let lineTop = top + padding + titleSectionHeight;
  bodyLines.forEach(line => {
    if (line) context.fillText(line, left + padding, lineTop);
    lineTop += bodyFontSize + lineGap;
  });
  context.restore();
}
