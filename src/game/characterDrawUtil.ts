import { clamp } from "@/common/numberUtil";
import { processCharacterEffects } from "./effects/effectUtil";
import { findCharacterPose } from "./itineraryUtil";
import { gameToCanvasPosition } from "./drawUtil";
import Character from "./types/Character";
import Room from "./types/Room";
import ScalingFactors from "./types/ScalingFactors";
import Effect from "./effects/types/Effect";
import ImageSet from "./types/ImageSet";
import { COLOR_BLACK, COLOR_DARK_GRAY, COLOR_POPOVER_FILL, COLOR_SPEECH_BUBBLE_FILL } from "./drawConstants";

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
  return character.id.charAt(0).toUpperCase() + character.id.slice(1);
}

function _getCharacterCarryText(character:Character):string {
  const itemCount = character.items.length;
  if (itemCount === 0) return "Carrying nothing.";
  if (itemCount === 1) return "Carrying 1 item.";
  return `Carrying ${itemCount} items.`;
}

function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number, room:Room,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  const [roomLeft, roomTop] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [roomRight, roomBottom] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const boxWidth = context.measureText(speech).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, roomLeft, roomRight - boxWidth));
  const top = Math.round(clamp(unclampedTop, roomTop, roomBottom - boxHeight));
  context.fillStyle = COLOR_SPEECH_BUBBLE_FILL;
  context.strokeStyle = COLOR_DARK_GRAY;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  context.fillRect(left, top, boxWidth, boxHeight);
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.fillStyle = COLOR_BLACK;
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

function _getCharacterSpeechAnchor(character:Character, scalingFactors:ScalingFactors, time:number) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const swayPhase = (time % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT;
  const anchorX = centerX + sway;
  const anchorTopY = centerY - characterHeight / 2;
  return { anchorX, anchorTopY, centerX, centerY, characterWidth, characterHeight };
}

function drawCharacter(character:Character, room:Room, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, speech:string|null, imageSet:ImageSet) {
  const { anchorX:backboneX, anchorTopY, centerX, centerY, characterWidth, characterHeight } = _getCharacterSpeechAnchor(character, scalingFactors, time);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  const faceImage = character.faceImageUrl ? imageSet.get(character.faceImageUrl) || null : null;
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
    if (speech) drawSpeechBubble(speech, backboneX, anchorTopY, room, scalingFactors, context);
    return;
  }
  context.stroke();

  const faceImageWidth = faceImage.width;
  const faceImageHeight = faceImage.height;
  if (!faceImageWidth || !faceImageHeight) {
    context.beginPath();
    context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, Math.PI * 2);
    context.stroke();
    if (speech) drawSpeechBubble(speech, backboneX, anchorTopY, room, scalingFactors, context);
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
  if (speech) drawSpeechBubble(speech, backboneX, anchorTopY, room, scalingFactors, context);
}

export function drawVisibleCharactersInRoom(room:Room, charactersInRoom:Character[], activeCharacter:Character,
  effects:Effect[], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, isPlaying:boolean, imageSet:ImageSet) {
  void activeCharacter;
  charactersInRoom.forEach(character => {
    const speech = isPlaying ? findCharacterPose(character, time).speech : null;
    drawCharacter(character, room, scalingFactors, context, time, speech, imageSet);
    processCharacterEffects(character, effects, context);
  });
}

export function drawCharacterPopover(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const canvasLeft = 0;
  const canvasTop = 0;
  const canvasRight = context.canvas.width;
  const canvasBottom = context.canvas.height;
  const title = _getCharacterDisplayName(character);
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
  const titleWidth = context.measureText(title).width;
  const boxWidth = Math.max(titleWidth, bodyWidth) + padding * 2;
  const titleHeight = titleFontSize;
  const bodyHeight = bodyLines.length * bodyFontSize + Math.max(0, bodyLines.length - 1) * lineGap;
  const boxHeight = padding * 2 + titleHeight + lineGap + bodyHeight;
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
  context.font = `${titleFontSize}px Jellee`;
  context.fillText(title, left + padding, top + padding);
  context.font = `${bodyFontSize}px Jellee`;
  let lineTop = top + padding + titleHeight + lineGap;
  bodyLines.forEach(line => {
    if (line) context.fillText(line, left + padding, lineTop);
    lineTop += bodyFontSize + lineGap;
  });
  context.restore();
}