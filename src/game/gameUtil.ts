/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import GameState from "./types/GameState";
import Room from "./types/Room";
import PlayerEvent from "./playerEvents/types/PlayerEvent";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import { ZERO_SCALING_FACTORS } from "./drawing/drawUtil";
import { calcCanvasAspectRatio, createCamera } from "./cameraUtil";
import { COLOR_BLACK } from "./drawing/drawColorConstants";
import { drawGameState, updateScalingFactorsAsNeeded } from "./drawing/gameStateDrawUtil";
import { findImageBitmap } from "./imageAssetUtil";
import Conclusion, { duplicateConclusion } from "./conclusions/types/Conclusion";
import ImageSet from "./types/ImageSet";
import { createEmptyImageSet } from "./imageSetUtil";
import { createItemsById, duplicateCharacterUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import {
  callOnActiveCharacterChangedAsNeeded,
  callOnDiscoveriesChangedAsNeeded,
  callOnMinutesChangedAsNeeded,
  callOnConclusionsChangedAsNeeded
} from "./gameStateNotificationUtil";
import { calcRenderedRoomsBoundingRect } from "./roomRoofUtil";
import { syncConclusionUnlocks } from './playerEvents';
import Discoveries, { createEmptyDiscoveries } from "./types/Discoveries";
import { createEmptyRoomShellCache } from "./types/RoomShellCache";
import { DRAW_FPS_COUNTER } from "@/developer/config";
import { updateAndDrawFps } from "@/developer/fpsUtil";
import { createInitialTimelineSnapshot } from "./timeline";
import { findMetaTimeNow } from "./metaTimeUtil";
import { createRevealedSkinLinkages } from "./skinLinkageUtil";
import Timeline from "./types/Timeline";
import { findCharacterKeyframeForTime } from "./timeline/retrievalUtil";
import Effect from "./effects/types/Effect";
import { updateGameState } from "./gameStateUpdateUtil";
export { pauseGameState } from "./gameStateUpdateUtil";

function _setActiveRoomDiscovered(gameState:GameState) {
  gameState.discoveryState.discoveredRoomIds.add(gameState.timelineSnapshot.activeRoom.id);
}

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeRoom = gameState.timelineSnapshot.activeRoom;
  if (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(activeRoom.id)) return null;
  return activeRoom;
}

function _fillCanvasBlack(context:CanvasRenderingContext2D) {
  context.fillStyle = COLOR_BLACK;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function _drawBackgroundImageToCanvas(backgroundImage:ImageBitmap, context:CanvasRenderingContext2D) {
  if (backgroundImage.width <= 0 || backgroundImage.height <= 0) {
    _fillCanvasBlack(context);
    return;
  }

  const drawHeight = context.canvas.height;
  const drawWidth = backgroundImage.width * (drawHeight / backgroundImage.height);
  const centerX = (context.canvas.width - drawWidth) / 2;

  for (let drawX = centerX; drawX < context.canvas.width; drawX += drawWidth) {
    context.drawImage(backgroundImage, drawX, 0, drawWidth, drawHeight);
  }
  for (let drawX = centerX - drawWidth; drawX + drawWidth > 0; drawX -= drawWidth) {
    context.drawImage(backgroundImage, drawX, 0, drawWidth, drawHeight);
  }
}

function _clearCanvas(gameState:GameState|null, context:CanvasRenderingContext2D) {
  if (!gameState?.backgroundImageUrl) {
    _fillCanvasBlack(context);
    return;
  }

  const backgroundImage = findImageBitmap(gameState.imageSet, gameState.backgroundImageUrl);
  if (!backgroundImage) {
    _fillCanvasBlack(context);
    return;
  }

  _drawBackgroundImageToCanvas(backgroundImage, context);
}

function _findCharacterSkinIdAtTime(timeline:Timeline, time:number, characterId:string):string {
  const characterI = timeline.characterIdToI[characterId];
  const characterKeyframe = findCharacterKeyframeForTime(timeline.keyframes, characterI, time);
  return characterKeyframe.skinId;
}

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D,
    onMinutesChanged:(minutes:number) => void, onIsPlayingChanged?:(isPlaying:boolean) => void,
    onActiveCharacterChanged?:(characterId:string) => void, onConclusionsChanged?:(conclusions:Conclusion[]) => void,
    onDiscoveriesChanged?:(discoveries:Discoveries) => void, onStateChanged?:(gameState:GameState) => void) {
  
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  const metaTime = findMetaTimeNow();
  _clearCanvas(gameState, context);

  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  updateGameState(gameState, events, metaTime, calcCanvasAspectRatio(context), onStateChanged);
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  callOnMinutesChangedAsNeeded(gameState, onMinutesChanged, metaTime);
  if (onActiveCharacterChanged) callOnActiveCharacterChangedAsNeeded(gameState, onActiveCharacterChanged);
  const activeVisibleRoom = _findActiveVisibleRoom(gameState);
  context.canvas.style.cursor = activeVisibleRoom && gameState.hoveredCharacterId && gameState.hoveredCharacterId !== gameState.activeCharacterId
    ? "pointer"
    : gameState.hoveredRoomId ? "pointer" : "default";

  updateScalingFactorsAsNeeded(gameState, context);
  if (onConclusionsChanged) callOnConclusionsChangedAsNeeded(gameState, onConclusionsChanged);
  if (onDiscoveriesChanged) callOnDiscoveriesChangedAsNeeded(gameState, onDiscoveriesChanged);
  drawGameState(gameState, context, metaTime);
  if (DRAW_FPS_COUNTER) updateAndDrawFps(metaTime, findMetaTimeNow(), context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const baseItemsById = createItemsById(level.rooms, level.characters, duplicateItemsById(level.itemsById));
  const baseCharacters = level.characters.map(character => duplicateCharacterUsingItemIndex(character, baseItemsById));
  const baseRooms = level.rooms.map(room => duplicateRoomUsingItemIndex(room, baseItemsById));
  const obscuredRoomIds = new Set(level.discoveryConfig.initiallyObscuredRoomIds);
  const activeSkinIdAtSelection = _findCharacterSkinIdAtTime(level.timeline, level.initialTime, level.activeCharacterId);
  const gameState:GameState = {
    activeCharacterId:level.activeCharacterId,
    activeSkinIdAtSelection,
    backgroundImageUrl:level.backgroundImageUrl,
    baseCharacters,
    baseItemsById,
    baseRooms,
    camera:createCamera(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY)),
    characterMetaTimeEffectsByCharacterId:new Map<string, Effect[]>(),
    conclusions:level.conclusions.map(duplicateConclusion),
    conclusionsRevision:0,
    discoveryState:{
      discoveredSkinIds:new Set<string>(),
      discoveredItemIds:new Set<string>(),
      discoveredRoomIds:new Set<string>(),
      titleKnownCharacterIds:new Set(level.discoveryConfig.initiallyKnownTitleCharacterIds),
      obscuredRoomIds,
      discoverableCharacterCount:level.discoveryConfig.discoverableCharacterCount,
      discoverableItemCount:level.discoveryConfig.discoverableItemCount,
      discoverableRoomCount:level.discoveryConfig.discoverableRoomCount,
      revealedSkinLinkages:createRevealedSkinLinkages(level.timeline.keyframes, baseRooms, obscuredRoomIds)
    },
    groundFloorY:level.groundFloorY,
    hoveredCharacterId:null,
    hoveredExitKey:null,
    hoveredItemId:null,
    hoveredRoomId:null,
    imageSet,
    isLevelComplete:false,
    isPlaying:false,
    labels:level.labels.map(label => ({...label})),
    lastActiveCharacterChangedValue:"",
    lastMinutesChangedCallMetaTime:Number.NEGATIVE_INFINITY,
    lastMinutesChangedValue:NaN,
    lastNotifiedConclusionsRevision:0,
    lastNotifiedDiscoveriesKey:JSON.stringify(createEmptyDiscoveries()),
    metaTimeEffects:[],
    metaTimeToGameTimeOffset:0,
    roomShellCacheByRoomId:createEmptyRoomShellCache(),
    roomShellCacheKey:'',
    roomTitleWrapsByRoomId:new Map<string, string[]>(),
    roomTitleWrapScalingFactors:ZERO_SCALING_FACTORS,
    scalingFactors:ZERO_SCALING_FACTORS,
    time:level.initialTime,
    timeline:level.timeline, // Timeline is a large, immutable data structure - no harm in sharing instance.
    timelineSnapshot:createInitialTimelineSnapshot(baseCharacters, baseRooms, level.timeline,
      level.activeCharacterId, level.initialTime, obscuredRoomIds),
    viewedItemIds:new Set<string>(),
    winSynopsis:level.winSynopsis,
  }
  _setActiveRoomDiscovered(gameState);
  syncConclusionUnlocks(gameState);
  return gameState;
}