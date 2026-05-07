import { gameToCanvasPosition } from "./drawUtil";
import { COLOR_ITEM_TEXT, VISIBILITY_CONE_ANGLE } from "./drawConstants";
import { getCharacterVisibilityOrigin } from "./characterDrawUtil";
import { isPositionVisible } from "./visibilityUtil";
import Character from "./types/Character";
import Item from "./types/Item";
import Room from "./types/Room";
import ScalingFactors from "./types/ScalingFactors";

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
  const glyphFontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.75));
  const labelFontSize = Math.max(7, Math.round(scalingFactors.roomFontHeight * 0.55));
  const labelOffsetY = glyphFontSize * 0.7;
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