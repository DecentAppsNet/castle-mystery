/* This module groups top-level game-state drawing responsibilities, including scaling updates, full-scene rendering, and cursor-related popover drawing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { DRAW_RESERVED_RECTS } from "@/developer/config";
import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { isCharacterInteractive, isItemInteractive } from "../interactivityUtil";
import { calcRoomRoofBounds } from "../roomRoofUtil";
import { findCharactersWithEffectsInRoom, findRoom, findRoomAtPosition } from "../roomUtil";
import GameState from "../types/GameState";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Room from "../types/Room";
import { createEmptyRoomShellVariantImages, RoomShellVariantImage } from "../types/RoomShellCache";
import { drawCharacterPopover } from "./characterDrawUtil";
import { COLOR_BLACK, COLOR_DARK_GRAY } from "./drawColorConstants";
import { createScratchCanvas } from "./canvasSurfaceUtil";
import { drawExitPopover } from "./exitDrawUtil";
import { drawObscuredRoom } from "./obscureDrawUtil";
import { drawCacheableRoomShell, drawRoomCharactersAndEffects, drawRoomShellExits, drawRoomTitle } from "./roomDrawUtil";
import { drawRoomRoofs } from "./roomRoofDrawUtil";
import { calcScalingFactorsForRect, gameToCanvasPosition } from "./drawUtil";
import { drawItemPopover } from "./itemDrawUtil";
import { calcLevelCameraRect, calcRoomCameraRect } from "../cameraUtil";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import { findImageBitmap } from "@/game/imageAssetUtil";
import { getGroundImageAssetUrl } from "../imageUrlUtil";
import { markCharacterDiscovered, markItemDiscovered } from "../discoveriesUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import Item from "../types/Item";
import { handleAfterLevelDrawEffects } from "./levelEffectDispatchUtil";

const GROUND_HEIGHT_STORIES = 4;
const GROUND_Y_OFFSET = -1.8;

function _drawReservedRects(layoutPlanner:CanvasLayoutPlanner, context:CanvasRenderingContext2D) {
  if (!DRAW_RESERVED_RECTS) return;
  context.save();
  context.strokeStyle = '#f00';
  context.lineWidth = 1;
  layoutPlanner.reservedRects.forEach(rect => context.strokeRect(rect.x, rect.y, rect.width, rect.height));
  context.restore();
}

function _drawGround(gameState:GameState, context:CanvasRenderingContext2D) {
  const groundImage = findImageBitmap(gameState.imageSet, getGroundImageAssetUrl());
  if (!groundImage || groundImage.width <= 0 || groundImage.height <= 0) return;

  const groundHeight = MAP_TILE_SIZE * GROUND_HEIGHT_STORIES;
  const groundWidth = groundHeight * (groundImage.width / groundImage.height);
  const visibleLeftX = gameState.camera.currentRect.x;
  const visibleRightX = gameState.camera.currentRect.x + gameState.camera.currentRect.width;
  const firstTileI = Math.floor(visibleLeftX / groundWidth);
  const lastTileI = Math.ceil(visibleRightX / groundWidth);

  const groundY = gameState.groundFloorY + GROUND_Y_OFFSET;
  for (let tileI = firstTileI; tileI <= lastTileI; ++tileI) {
    const tileLeftX = tileI * groundWidth;
    const tileRightX = tileLeftX + groundWidth;
    const [canvasLeftX, canvasTopY] = gameToCanvasPosition(tileLeftX, groundY, gameState.scalingFactors);
    const [canvasRightX, canvasBottomY] = gameToCanvasPosition(tileRightX, groundY + groundHeight, gameState.scalingFactors);
    context.drawImage(groundImage, canvasLeftX, canvasTopY, canvasRightX - canvasLeftX, canvasBottomY - canvasTopY);
  }

  const [, groundCanvasBottomY] = gameToCanvasPosition(0, groundY + groundHeight, gameState.scalingFactors);
  if (groundCanvasBottomY < context.canvas.height) {
    context.fillStyle = COLOR_BLACK;
    context.fillRect(0, Math.max(0, groundCanvasBottomY), context.canvas.width, context.canvas.height - Math.max(0, groundCanvasBottomY));
  }
}

function _findHoveredItem(rooms:Room[], gameState:GameState):{room:Room, item:Item}|null {
  if (!gameState.hoveredItemId) return null;
  const candidateRooms = gameState.isLevelComplete
    ? rooms.filter(room => gameState.discoveryState.discoveredRoomIds.has(room.id))
    : rooms;
  for (const room of candidateRooms) {
    const hoveredItem = room.items.find(item => item.id === gameState.hoveredItemId) || null;
    if (hoveredItem) return { room, item:hoveredItem };
  }
  return null;
}

function _findHoveredExit(gameState:GameState):RoomExit|null {
  if (!gameState.hoveredExitKey) return null;
  for (const room of gameState.baseRooms) {
    const hoveredExit = room.exits.find(exit => exit.id === gameState.hoveredExitKey) || null;
    if (hoveredExit) return hoveredExit;
  }
  return null;
}

function _findHoveredCharacterHighlightId(gameState:GameState, canShowHoverPopovers:boolean):string|null {
  if (!canShowHoverPopovers || !gameState.hoveredCharacterId) return null;
  const hoveredCharacter = gameState.baseCharacters.find(character => character.id === gameState.hoveredCharacterId) || null;
  if (!hoveredCharacter || !isCharacterInteractive(hoveredCharacter)) return null;
  return hoveredCharacter.id;
}

function _findHoveredItemHighlightId(snapshotRooms:Room[], gameState:GameState, canShowHoverPopovers:boolean):string|null {
  if (!canShowHoverPopovers || !gameState.hoveredItemId) return null;
  const hoveredItem = _findHoveredItem(snapshotRooms, gameState);
  if (!hoveredItem || !isItemInteractive(hoveredItem.item)) return null;
  return hoveredItem.item.id;
}

function _calcRoomShellCacheKey(destWidth:number, destHeight:number):string {
  return [destWidth, destHeight].join('|');
}

function _calcRoomShellScalingFactors(room:Room, gameState:GameState, destWidth:number, destHeight:number):ScalingFactors {
  const aspectRatio = destHeight > 0 ? destWidth / destHeight : 1;
  const roomCameraRect = calcRoomCameraRect(room, gameState.baseRooms, aspectRatio, gameState.groundFloorY);
  const levelCameraRect = calcLevelCameraRect(gameState.baseRooms, aspectRatio, gameState.groundFloorY);
  const scalingFactors = calcScalingFactorsForRect(roomCameraRect, destWidth, destHeight);
  return {
    ...scalingFactors,
    roomLineWidth:Math.max(1, scalingFactors.roomLineWidth * (levelCameraRect.height / roomCameraRect.height))
  };
}

function _calcProjectedRoomShellBounds(room:Room, rooms:ReadonlyArray<Room>, groundFloorY:number,
  scalingFactors:ScalingFactors):{ leftX:number, topY:number, width:number, height:number } {
  const roofBounds = calcRoomRoofBounds(room, rooms, groundFloorY);
  const [leftX, topY] = gameToCanvasPosition(roofBounds.x, roofBounds.y, scalingFactors);
  const [roomRightX, roomBottomY] = gameToCanvasPosition(
    room.rect.x + room.rect.width,
    room.rect.y + room.rect.height,
    scalingFactors
  );
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const rightX = roomRightX + offsetX;
  const bottomY = roomBottomY + offsetY;
  return {
    leftX,
    topY,
    width:rightX - leftX,
    height:bottomY - topY
  };
}

function _createRoomVisualCanvas(room:Room, gameState:GameState, destWidth:number, destHeight:number,
  draw:(scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) => void):RoomShellVariantImage {
  const visualScalingFactors = _calcRoomShellScalingFactors(room, gameState, destWidth, destHeight);
  const visualBounds = _calcProjectedRoomShellBounds(room, gameState.baseRooms, gameState.groundFloorY, visualScalingFactors);
  const padding = Math.max(2, Math.ceil(visualScalingFactors.roomLineWidth));
  const canvasWidth = Math.max(1, Math.ceil(visualBounds.width) + padding * 2);
  const canvasHeight = Math.max(1, Math.ceil(visualBounds.height) + padding * 2);
  const visualCanvas = createScratchCanvas(canvasWidth, canvasHeight);
  if (!visualCanvas) return { image:null, width:0, height:0, padding:0 };
  const visualContext = visualCanvas.getContext('2d');
  if (!visualContext) return { image:null, width:0, height:0, padding:0 };

  const localScalingFactors = {
    ...visualScalingFactors,
    translateX:visualScalingFactors.translateX - visualBounds.leftX + padding,
    translateY:visualScalingFactors.translateY - visualBounds.topY + padding,
    destWidth:canvasWidth,
    destHeight:canvasHeight
  };

  visualContext.clearRect(0, 0, canvasWidth, canvasHeight);
  draw(localScalingFactors, visualContext as unknown as CanvasRenderingContext2D);
  return {
    image:visualCanvas,
    width:canvasWidth,
    height:canvasHeight,
    padding
  };
}

function _createRoomShellCanvas(room:Room, gameState:GameState, destWidth:number, destHeight:number,
  isActive:boolean):RoomShellVariantImage {
  return _createRoomVisualCanvas(room, gameState, destWidth, destHeight, (scalingFactors, context) => {
    drawCacheableRoomShell(room, gameState.baseRooms, isActive, gameState.groundFloorY,
      scalingFactors, context, false, true, gameState.imageSet, false, false, false);
  });
}

function _createRoomSilhouetteCanvas(room:Room, gameState:GameState, destWidth:number, destHeight:number):RoomShellVariantImage {
  return _createRoomVisualCanvas(room, gameState, destWidth, destHeight, (scalingFactors, context) => {
    drawCacheableRoomShell(room, gameState.baseRooms, false, gameState.groundFloorY,
      scalingFactors, context, false, true, null, true, false, false);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = COLOR_DARK_GRAY;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.globalCompositeOperation = 'source-over';
  });
}

function _createRoomRoofCanvas(room:Room, gameState:GameState, destWidth:number, destHeight:number):RoomShellVariantImage {
  return _createRoomVisualCanvas(room, gameState, destWidth, destHeight, (scalingFactors, context) => {
    drawRoomRoofs(room, gameState.baseRooms, gameState.groundFloorY, scalingFactors, context);
  });
}

function _ensureRoomShellCaches(gameState:GameState, context:CanvasRenderingContext2D) {
  const destWidth = context.canvas.width;
  const destHeight = context.canvas.height;
  if (destWidth <= 0 || destHeight <= 0) return;

  const cacheKey = _calcRoomShellCacheKey(destWidth, destHeight);
  if (gameState.roomShellCacheKey !== cacheKey) {
    gameState.roomShellCacheKey = cacheKey;
    gameState.roomShellCacheByRoomId.clear();
  }

  for (const room of gameState.baseRooms) {
    if (gameState.roomShellCacheByRoomId.has(room.id)) continue;
    gameState.roomShellCacheByRoomId.set(room.id, {
      ...createEmptyRoomShellVariantImages(),
      active:_createRoomShellCanvas(room, gameState, destWidth, destHeight, true),
      inactive:_createRoomShellCanvas(room, gameState, destWidth, destHeight, false),
      silhouette:_createRoomSilhouetteCanvas(room, gameState, destWidth, destHeight),
      roof:_createRoomRoofCanvas(room, gameState, destWidth, destHeight)
    });
  }
}

function _drawCachedRoomVariant(cachedVariant:RoomShellVariantImage|null, room:Room, gameState:GameState,
  context:CanvasRenderingContext2D, includeUndiscovered:boolean = false):boolean {
  if (!includeUndiscovered && !gameState.discoveryState.discoveredRoomIds.has(room.id)) return false;
  if (!cachedVariant?.image || cachedVariant.width <= 0 || cachedVariant.height <= 0) return false;

  const shellBounds = _calcProjectedRoomShellBounds(room, gameState.baseRooms, gameState.groundFloorY, gameState.scalingFactors);
  const logicalDestWidth = Math.max(1, shellBounds.width);
  const logicalDestHeight = Math.max(1, shellBounds.height);
  const logicalSourceWidth = Math.max(1, cachedVariant.width - cachedVariant.padding * 2);
  const logicalSourceHeight = Math.max(1, cachedVariant.height - cachedVariant.padding * 2);
  const horizontalPaddingRatio = cachedVariant.padding / logicalSourceWidth;
  const verticalPaddingRatio = cachedVariant.padding / logicalSourceHeight;
  const destX = shellBounds.leftX - logicalDestWidth * horizontalPaddingRatio;
  const destY = shellBounds.topY - logicalDestHeight * verticalPaddingRatio;
  const destWidth = logicalDestWidth * (cachedVariant.width / logicalSourceWidth);
  const destHeight = logicalDestHeight * (cachedVariant.height / logicalSourceHeight);
  context.drawImage(cachedVariant.image, destX, destY, destWidth, destHeight);
  return true;
}

function _drawCachedRoomShell(room:Room, gameState:GameState, isActive:boolean, context:CanvasRenderingContext2D):boolean {
  const roomShellVariants = gameState.roomShellCacheByRoomId.get(room.id);
  const cachedVariant = roomShellVariants
    ? ((gameState.isLevelComplete || isActive) ? roomShellVariants.active : roomShellVariants.inactive)
    : null;
  return _drawCachedRoomVariant(cachedVariant, room, gameState, context);
}

function _drawCachedRoomRoof(room:Room, gameState:GameState, context:CanvasRenderingContext2D):boolean {
  const roomShellVariants = gameState.roomShellCacheByRoomId.get(room.id) || null;
  return _drawCachedRoomVariant(roomShellVariants?.roof || null, room, gameState, context);
}

function _drawRoomSilhouettes(gameState:GameState, context:CanvasRenderingContext2D) {
  for (const room of gameState.baseRooms) {
    if (gameState.discoveryState.discoveredRoomIds.has(room.id)) continue;
    const roomShellVariants = gameState.roomShellCacheByRoomId.get(room.id) || null;
    _drawCachedRoomVariant(roomShellVariants?.silhouette || null, room, gameState, context, true);
  }
}

export function updateScalingFactorsAsNeeded(gameState:GameState, context:CanvasRenderingContext2D):ScalingFactors {
  const destW = context.canvas.width;
  const destH = context.canvas.height;
  let scalingFactors = gameState.scalingFactors;
  assertNonNullable(scalingFactors);
  const destSizeChanged = scalingFactors.destWidth !== destW || scalingFactors.destHeight !== destH;
  if (destSizeChanged
    || scalingFactors.sourceX !== gameState.camera.currentRect.x || scalingFactors.sourceY !== gameState.camera.currentRect.y
    || scalingFactors.sourceWidth !== gameState.camera.currentRect.width || scalingFactors.sourceHeight !== gameState.camera.currentRect.height) {
    scalingFactors = calcScalingFactorsForRect(gameState.camera.currentRect, destW, destH);
    const levelCameraRect = calcLevelCameraRect(gameState.baseRooms, destW / destH, gameState.groundFloorY);
    gameState.roomTitleWrapScalingFactors = calcScalingFactorsForRect(levelCameraRect, destW, destH);
    if (destSizeChanged) gameState.roomTitleWrapsByRoomId.clear();
    scalingFactors = {
      ...scalingFactors,
      roomLineWidth:Math.max(1, scalingFactors.roomLineWidth * (levelCameraRect.height / gameState.camera.currentRect.height))
    };
    gameState.scalingFactors = scalingFactors;
  }
  return scalingFactors;
}

export function drawGameState(gameState:GameState, context:CanvasRenderingContext2D, metaTime:number) {
  _ensureRoomShellCaches(gameState, context);
  const { activeCharacter, activeRoom, characters, rooms } = gameState.timelineSnapshot;
  const canShowHoverPopovers = gameState.isLevelComplete
    || !gameState.discoveryState.obscuredRoomIds.has(activeRoom.id);
  const hoveredCharacterHighlightId = _findHoveredCharacterHighlightId(gameState, canShowHoverPopovers);
  const hoveredItemHighlightId = _findHoveredItemHighlightId(rooms, gameState, canShowHoverPopovers);
  const drawnExitIds = new Set<string>();
  const layoutPlanner = new CanvasLayoutPlanner(context.canvas.width, context.canvas.height);
  _drawGround(gameState, context);
  _drawRoomSilhouettes(gameState, context);
  const roomRenderStates = rooms.map(room => {
    const charactersInRoom = findCharactersWithEffectsInRoom(room, characters);
    const isActive = activeRoom.id === room.id;
    return { room, charactersInRoom, isActive };
  });
  for (const { room, charactersInRoom, isActive } of roomRenderStates) {
    const drewCachedRoomShell = _drawCachedRoomShell(room, gameState, isActive, context);
    if (drewCachedRoomShell) {
      if (gameState.discoveryState.obscuredRoomIds.has(room.id) && !gameState.isLevelComplete
        && gameState.discoveryState.discoveredRoomIds.has(room.id)) {
        drawObscuredRoom(room, gameState.scalingFactors, context, metaTime);
      }
      drawRoomShellExits(room, rooms, characters, drawnExitIds,
        gameState.scalingFactors, context, gameState.isLevelComplete, isActive, layoutPlanner, gameState.imageSet,
        gameState.discoveryState.discoveredRoomIds.has(room.id));
    } else {
      drawCacheableRoomShell(room, rooms, isActive, gameState.groundFloorY, gameState.scalingFactors,
        context, gameState.isLevelComplete, false, gameState.imageSet, false,
        gameState.discoveryState.discoveredRoomIds.has(room.id), gameState.discoveryState.obscuredRoomIds.has(room.id));
      if (gameState.discoveryState.obscuredRoomIds.has(room.id) && !gameState.isLevelComplete
        && gameState.discoveryState.discoveredRoomIds.has(room.id)) {
        drawObscuredRoom(room, gameState.scalingFactors, context, metaTime);
      }
      drawRoomShellExits(room, rooms, characters, drawnExitIds,
        gameState.scalingFactors, context, gameState.isLevelComplete, isActive, layoutPlanner, gameState.imageSet,
        gameState.discoveryState.discoveredRoomIds.has(room.id));
    }
    if (!gameState.discoveryState.discoveredRoomIds.has(room.id)) continue;
    drawRoomCharactersAndEffects(room, charactersInRoom, isActive, activeCharacter, 
      hoveredCharacterHighlightId, hoveredItemHighlightId, gameState.scalingFactors, context,
      gameState.time, metaTime, gameState.imageSet, gameState.discoveryState,
      gameState.isLevelComplete, layoutPlanner);
    if (!_drawCachedRoomRoof(room, gameState, context)) {
      drawRoomRoofs(room, gameState.baseRooms, gameState.groundFloorY, gameState.scalingFactors, context);
    }
  }
  for (const { room, isActive } of roomRenderStates) {
    drawRoomTitle(room, isActive, gameState, context, layoutPlanner);
  }
  handleAfterLevelDrawEffects(characters, activeRoom, gameState.isLevelComplete, gameState.scalingFactors,
    gameState.time, metaTime, context);
  if (canShowHoverPopovers && gameState.hoveredItemId) {
    const hoveredItem = _findHoveredItem(rooms, gameState);
    if (hoveredItem && isItemInteractive(hoveredItem.item)) {
      markItemDiscovered(gameState, hoveredItem.item);
      drawItemPopover(hoveredItem.room, hoveredItem.item, gameState.scalingFactors, context, gameState.imageSet, layoutPlanner);
    }
  } else if (canShowHoverPopovers && gameState.hoveredCharacterId) {
    const hoveredCharacter = characters.find(character => character.id === gameState.hoveredCharacterId) || null;
    if (hoveredCharacter && isCharacterInteractive(hoveredCharacter)) {
      const hoveredCharacterRoom = findRoomAtPosition(gameState.baseRooms, hoveredCharacter.position.x, hoveredCharacter.position.y);
      markCharacterDiscovered(gameState, hoveredCharacter);
      if (hoveredCharacter.rightHandItem) markItemDiscovered(gameState, hoveredCharacter.rightHandItem);
      if (hoveredCharacter.leftHandItem) markItemDiscovered(gameState, hoveredCharacter.leftHandItem);
      drawCharacterPopover(hoveredCharacter, gameState.scalingFactors, context, gameState.time, gameState.imageSet,
        gameState.discoveryState.titleKnownCharacterIds.has(hoveredCharacter.id), layoutPlanner, hoveredCharacterRoom);
    }
  } else if (canShowHoverPopovers && gameState.hoveredExitKey) {
    const hoveredExit = _findHoveredExit(gameState);
    if (hoveredExit) {
      const room1 = findRoom(gameState.baseRooms, hoveredExit.room1Id);
      const room2 = findRoom(gameState.baseRooms, hoveredExit.room2Id);
      assertNonNullable(room1, `room ${hoveredExit.room1Id} not found`);
      assertNonNullable(room2, `room ${hoveredExit.room2Id} not found`);
      drawExitPopover(hoveredExit, room1, room2, gameState.baseItemsById, gameState.discoveryState.discoveredRoomIds,
        gameState.scalingFactors, context, layoutPlanner);
    }
  }
  _drawReservedRects(layoutPlanner, context);
}
