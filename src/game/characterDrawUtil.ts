import { clamp } from "@/common/numberUtil";
import { findCharacterPose } from "./itineraryUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { calcVisibilityPolygon, isPositionVisible } from "./visibilityUtil";
import Character from "./types/Character";
import Position from "./types/Position";
import Room from "./types/Room";
import ScalingFactors from "./types/ScalingFactors";
import { COLOR_BLACK, COLOR_DARK_GRAY, COLOR_SPEECH_BUBBLE_FILL, COLOR_VISIBILITY_FILL, VISIBILITY_CONE_ANGLE } from "./drawConstants";

const CHARACTER_SWAY_INTERVAL = 1500;
const CHARACTER_SWAY_AMOUNT = 1;

export function getCharacterVisibilityOrigin(character:Character, scalingFactors:ScalingFactors):Position {
  const characterHeightPixels = scalingFactors.roomLineWidth * 10;
  const characterHeightGame = characterHeightPixels / scalingFactors.scaleY;
  return {
    x: character.x,
    y: character.y - characterHeightGame * 0.75
  };
}

export function drawVisibilityCone(activeCharacter:Character, room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const visibilityOrigin = getCharacterVisibilityOrigin(activeCharacter, scalingFactors);
  const visibilityPolygon = calcVisibilityPolygon(visibilityOrigin, activeCharacter.facingAngle, room, VISIBILITY_CONE_ANGLE);
  if (visibilityPolygon.length < 3) return;

  context.fillStyle = COLOR_VISIBILITY_FILL;
  context.beginPath();
  const [startX, startY] = gameToCanvasPosition(visibilityPolygon[0].x, visibilityPolygon[0].y, scalingFactors);
  context.moveTo(startX, startY);
  for (let i = 1; i < visibilityPolygon.length; ++i) {
    const point = visibilityPolygon[i];
    const [pointX, pointY] = gameToCanvasPosition(point.x, point.y, scalingFactors);
    context.lineTo(pointX, pointY);
  }
  context.closePath();
  context.fill();
}

export function findVisibleCharactersInRoom(room:Room, charactersInRoom:Character[], activeCharacter:Character, scalingFactors:ScalingFactors):Character[] {
  const visibilityOrigin = getCharacterVisibilityOrigin(activeCharacter, scalingFactors);
  return charactersInRoom.filter(character => {
    if (character.id === activeCharacter.id) return true;
    return isPositionVisible(
      visibilityOrigin,
      { x: character.x, y: character.y },
      activeCharacter.facingAngle,
      room,
      VISIBILITY_CONE_ANGLE
    );
  });
}

export function drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number, room:Room,
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

export function drawCharacter(character:Character, room:Room, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, time:number, speech:string|null) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = COLOR_BLACK;
  const swayPhase = (time % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL;
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT;
  const backboneX = centerX + sway;
  if (speech) drawSpeechBubble(speech, backboneX, centerY - characterHeight / 2, room, scalingFactors, context);
  context.beginPath();
  context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, 2 * Math.PI);
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
}

export function drawVisibleCharactersInRoom(room:Room, charactersInRoom:Character[], activeCharacter:Character,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, isPlaying:boolean) {
  const visibleCharacters = findVisibleCharactersInRoom(room, charactersInRoom, activeCharacter, scalingFactors);
  visibleCharacters.forEach(character => {
    const speech = isPlaying ? findCharacterPose(character, time).speech : null;
    drawCharacter(character, room, scalingFactors, context, time, speech);
  });
}