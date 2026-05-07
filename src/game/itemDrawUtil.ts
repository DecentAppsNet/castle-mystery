import { clamp } from "@/common/numberUtil";
import Rect from "./types/Rect";
import { gameToCanvasPosition } from "./drawUtil";
import { COLOR_BLACK, COLOR_ITEM_TEXT, COLOR_POPOVER_FILL, VISIBILITY_CONE_ANGLE } from "./drawConstants";
import { getCharacterVisibilityOrigin } from "./characterDrawUtil";
import { isPositionVisible } from "./visibilityUtil";
import Character from "./types/Character";
import Item from "./types/Item";
import Room from "./types/Room";
import ScalingFactors from "./types/ScalingFactors";

const ITEM_GLYPH_FONT_RATIO = 0.75;
const ITEM_LABEL_FONT_RATIO = 0.55;

function _getItemGlyphFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(10, Math.round(scalingFactors.roomFontHeight * ITEM_GLYPH_FONT_RATIO));
}

function _getItemLabelFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(7, Math.round(scalingFactors.roomFontHeight * ITEM_LABEL_FONT_RATIO));
}

function _getItemLabelOffsetY(scalingFactors:ScalingFactors):number {
  return _getItemGlyphFontSize(scalingFactors) * 0.7;
}

function _getApproxTextWidth(text:string, fontSize:number):number {
  return Math.max(fontSize, text.length * fontSize * 0.6);
}

function _getItemHoverRect(item:Item, scalingFactors:ScalingFactors):Rect {
  const glyphFontSize = _getItemGlyphFontSize(scalingFactors);
  const labelFontSize = _getItemLabelFontSize(scalingFactors);
  const labelOffsetY = _getItemLabelOffsetY(scalingFactors);
  const hoverWidthPixels = Math.max(glyphFontSize * 1.2, _getApproxTextWidth(item.title, labelFontSize));
  const topPixels = -glyphFontSize * 0.6;
  const bottomPixels = labelOffsetY + labelFontSize * 0.8;
  return {
    x: item.position.x - (hoverWidthPixels / 2) / scalingFactors.scaleX,
    y: item.position.y + topPixels / scalingFactors.scaleY,
    width: hoverWidthPixels / scalingFactors.scaleX,
    height: (bottomPixels - topPixels) / scalingFactors.scaleY
  };
}

function _wrapText(context:CanvasRenderingContext2D, text:string, maxWidth:number):string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines:string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; ++i) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

export function discoverVisibleItemsInRoom(room:Room, activeCharacter:Character, scalingFactors:ScalingFactors) {
  const visibilityOrigin = getCharacterVisibilityOrigin(activeCharacter, scalingFactors);
  room.items.forEach(item => {
    if (item.isDiscovered) return;
    item.isDiscovered = isPositionVisible(
      visibilityOrigin,
      item.position,
      activeCharacter.facingAngle,
      room,
      VISIBILITY_CONE_ANGLE
    );
  });
}

export function drawItem(item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [x, y] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  const glyphFontSize = _getItemGlyphFontSize(scalingFactors);
  const labelFontSize = _getItemLabelFontSize(scalingFactors);
  const labelOffsetY = _getItemLabelOffsetY(scalingFactors);
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = COLOR_ITEM_TEXT;
  context.font = `${glyphFontSize}px Jellee`;
  context.fillText(item.displayChar, x, y);
  context.font = `${labelFontSize}px Jellee`;
  context.fillText(item.title, x, y + labelOffsetY);
  context.restore();
}

export function drawDiscoveredItemsInRoom(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  room.items.filter(item => item.isDiscovered).forEach(item => drawItem(item, scalingFactors, context));
}

export function findDiscoveredItemAtPosition(room:Room, x:number, y:number, scalingFactors:ScalingFactors):Item|null {
  for (let i = room.items.length - 1; i >= 0; --i) {
    const item = room.items[i];
    if (!item.isDiscovered) continue;
    const rect = _getItemHoverRect(item, scalingFactors);
    const isInside = x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    if (isInside) return item;
  }
  return null;
}

export function drawItemPopover(item:Item, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [anchorX, anchorY] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  const canvasLeft = 0;
  const canvasTop = 0;
  const canvasRight = context.canvas.width;
  const canvasBottom = context.canvas.height;
  const titleFontSize = Math.max(20, Math.round(scalingFactors.roomFontHeight * 1.4));
  const descriptionFontSize = Math.max(16, Math.round(scalingFactors.roomFontHeight * 1.0));
  const padding = Math.max(6, scalingFactors.roomLineWidth * 2);
  const lineGap = Math.max(3, scalingFactors.roomLineWidth);
  const maxTextWidth = Math.min(280, Math.max(140, canvasRight * 0.3));
  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = `${descriptionFontSize}px Jellee`;
  const descriptionLines = _wrapText(context, item.description, maxTextWidth);
  const descriptionWidth = descriptionLines.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0);
  context.font = `${titleFontSize}px Jellee`;
  const titleWidth = context.measureText(item.title).width;
  const boxWidth = Math.max(titleWidth, descriptionWidth) + padding * 2;
  const titleHeight = titleFontSize;
  const descriptionHeight = descriptionLines.length * descriptionFontSize + Math.max(0, descriptionLines.length - 1) * lineGap;
  const boxHeight = padding * 2 + titleHeight + lineGap + descriptionHeight;
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
  context.fillText(item.title, left + padding, top + padding);
  context.font = `${descriptionFontSize}px Jellee`;
  let lineTop = top + padding + titleHeight + lineGap;
  descriptionLines.forEach(line => {
    context.fillText(line, left + padding, lineTop);
    lineTop += descriptionFontSize + lineGap;
  });
  context.restore();
}