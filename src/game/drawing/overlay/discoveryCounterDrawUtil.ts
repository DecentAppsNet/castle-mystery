/* v8 ignore file -- Visual canvas drawing is verified manually. @preserve */

import { assertNonNullable } from "decent-portal";
import { createDiscoveries } from "../../discoveriesUtil";
import { ROOM_DISCOVERY_ICON_URL, UNKNOWN_CHARACTER_ICON_URL, UNKNOWN_ITEM_ICON_URL } from "../../discoveryIconUrlUtil";
import GameState from "../../types/GameState";

type BookRect = { x:number, y:number, width:number, height:number };

export function drawDiscoveryCounters(gameState:GameState, bookRect:BookRect, context:CanvasRenderingContext2D):void {
  const { width:canvasWidth, height:canvasHeight } = context.canvas;
  const slotWidth = canvasHeight * 0.14;
  const gap = canvasHeight * 0.02;
  const groupWidth = 3 * slotWidth + 2 * gap;
  const groupX = (canvasWidth - groupWidth) / 2;
  const { y, height } = bookRect;
  if (height <= 0 || y < 0 || y + height > canvasHeight || groupX < 0 ||
      groupX + groupWidth > canvasWidth || groupX < bookRect.x + bookRect.width) return;

  const discoveries = createDiscoveries(gameState);
  const counters = [
    [discoveries.discoveredCharacterIconUrls.at(-1), UNKNOWN_CHARACTER_ICON_URL,
      discoveries.discoveredCharacterIconUrls.length, discoveries.characterCount],
    [undefined, ROOM_DISCOVERY_ICON_URL, discoveries.discoveredRoomCount, discoveries.roomCount],
    [discoveries.discoveredItemIconUrls.at(-1), UNKNOWN_ITEM_ICON_URL,
      discoveries.discoveredItemIconUrls.length, discoveries.itemCount]
  ] as const;
  const { imageSet } = gameState;
  const iconSize = height * 0.8;
  const padding = height * 0.08;
  const centerY = y + height / 2;

  context.save();
  context.font = `bold ${height * 0.3}px Georgia, serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = height * 0.04;
  context.strokeStyle = '#35271c';
  context.fillStyle = '#fff5db';

  counters.forEach(([iconUrl, fallbackUrl, count, total], counterIndex) => {
    const slotX = groupX + counterIndex * (slotWidth + gap);
    const icon = (iconUrl && imageSet.findImage(iconUrl)) || imageSet.findImage(fallbackUrl);
    assertNonNullable(icon, `Missing discovery icon asset ${fallbackUrl}`);
    const { width, height:sourceHeight } = icon.visibleSourceRect ?? icon.image;
    const scale = iconSize / Math.max(width, sourceHeight);
    const iconWidth = width * scale;
    const iconHeight = sourceHeight * scale;
    imageSet.drawImage(icon, slotX + (iconSize - iconWidth) / 2, centerY - iconHeight / 2,
      iconWidth, iconHeight, context);
    const label = `${count} of ${total}`;
    const labelWidth = slotWidth - iconSize - 2 * padding;
    const labelX = slotX + iconSize + padding + labelWidth / 2;
    context.strokeText(label, labelX, centerY, labelWidth);
    context.fillText(label, labelX, centerY, labelWidth);
  });
  context.restore();
}