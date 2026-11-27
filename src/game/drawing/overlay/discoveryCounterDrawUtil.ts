/* v8 ignore file -- Visual canvas drawing is verified manually. @preserve */

import { assertNonNullable } from "decent-portal";
import { createDiscoveries } from "../../discoveriesUtil";
import { ROOM_DISCOVERY_ICON_URL, UNKNOWN_CHARACTER_ICON_URL, UNKNOWN_ITEM_ICON_URL } from "./overlayIconUrls";
import GameState from "../../types/GameState";

type BookRect = { x:number, y:number, width:number, height:number };
type CounterAnimation = { count:number, startedAt:number };

const DISCOVERY_GROWTH_DURATION_MS = 100;
const DISCOVERY_SHRINK_DURATION_MS = 500;
const DISCOVERY_PEAK_SCALE = 1.5;
const DISCOVERY_ICON_HEIGHT_RATIO = 0.8;
const counterAnimationsByGameState = new WeakMap<GameState, CounterAnimation[]>();

export function getPeakDiscoveryIconSize(bookHeight:number):number {
  return bookHeight * DISCOVERY_ICON_HEIGHT_RATIO * DISCOVERY_PEAK_SCALE;
}

function _getDiscoveryCounts(gameState:GameState):number[] {
  const { discoveredSkinIds, discoveredRoomIds, discoveredItemIds } = gameState.discoveryState;
  return [discoveredSkinIds.size, discoveredRoomIds.size, discoveredItemIds.size];
}

export function initializeDiscoveryCounterAnimations(gameState:GameState):void {
  if (counterAnimationsByGameState.has(gameState)) return;
  counterAnimationsByGameState.set(gameState, _getDiscoveryCounts(gameState).map(count => ({ count, startedAt:-Infinity })));
}

function _getIconScale(elapsed:number):number {
  const progress = elapsed < DISCOVERY_GROWTH_DURATION_MS
    ? elapsed / DISCOVERY_GROWTH_DURATION_MS
    : Math.max(0, 1 - (elapsed - DISCOVERY_GROWTH_DURATION_MS) / DISCOVERY_SHRINK_DURATION_MS);
  return 1 + (DISCOVERY_PEAK_SCALE - 1) * progress;
}

export function drawDiscoveryCounters(gameState:GameState, bookRect:BookRect, context:CanvasRenderingContext2D,
    metaTime:number):void {
  const animations = counterAnimationsByGameState.get(gameState);
  assertNonNullable(animations);
  _getDiscoveryCounts(gameState).forEach((count, counterIndex) => {
    const animation = animations[counterIndex];
    if (count > animation.count) animation.startedAt = metaTime;
    animation.count = count;
  });

  const { width:canvasWidth, height:canvasHeight } = context.canvas;
  const slotWidth = canvasHeight * 0.18;
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
  const iconSize = height * DISCOVERY_ICON_HEIGHT_RATIO;
  const peakIconSize = getPeakDiscoveryIconSize(height);
  const padding = height * 0.08;
  const centerY = y + height / 2;
  const fontSize = height * 0.3;

  context.save();
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
    const animationScale = _getIconScale(metaTime - animations[counterIndex].startedAt);
    const scale = iconSize * animationScale / Math.max(width, sourceHeight);
    const iconWidth = width * scale;
    const iconHeight = sourceHeight * scale;
    imageSet.drawImage(icon, slotX + (peakIconSize - iconWidth) / 2, centerY - iconHeight / 2,
      iconWidth, iconHeight, context);
    const label = `${count} of ${total}`;
    const labelWidth = slotWidth - peakIconSize - 2 * padding;
    const labelX = slotX + peakIconSize + padding + labelWidth / 2;
    context.font = `bold ${fontSize}px Georgia, serif`;
    const measuredWidth = context.measureText(label).width;
    if (measuredWidth > labelWidth) context.font = `bold ${fontSize * labelWidth / measuredWidth}px Georgia, serif`;
    context.strokeText(label, labelX, centerY);
    context.fillText(label, labelX, centerY);
  });
  context.restore();
}