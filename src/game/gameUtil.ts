/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { botch } from "decent-portal";

import GameState from "./types/GameState";
import Room from "./types/Room";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import ChangeConclusionsEvent from "./types/playerEvents/ChangeConclusionsEvent";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import { ZERO_SCALING_FACTORS } from "./drawing/drawUtil";
import { calcCanvasAspectRatio, createCamera, syncCameraTargetToActiveRoom, updateCamera } from "./cameraUtil";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import MouseWheelEvent from "./types/playerEvents/MouseWheelEvent";
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
import { updateGameStateForMouseDown, updateGameStateForMouseMove } from "./hoverStateUtil";
import { syncConclusionUnlocks, updateGameStateForChangeConclusions } from "./conclusionStateUtil";
import { calcRenderedRoomsBoundingRect } from "./roomRoofUtil";
import { clamp } from "@/common/numberUtil";
import Discoveries, { createEmptyDiscoveries } from "./types/Discoveries";
import { createEmptyRoomShellCache } from "./types/RoomShellCache";
import { DRAW_FPS_COUNTER } from "@/developer/config";
import { updateAndDrawFps } from "@/developer/fpsUtil";
import { createTimelineSnapshot, createInitialTimelineSnapshot } from "./timeline";
import { findMetaTimeNow } from "./metaTimeUtil";

const CAMERA_ZOOM_STEP = 0.1;

function _setActiveRoomDiscovered(gameState:GameState) {
  gameState.discoveryState.discoveredRoomIds.add(gameState.timelineSnapshot.activeRoom.id);
}

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent, _metaTime:number) {
  // const wasPlaying = gameState.isPlaying;
  gameState.time = event.time;
  gameState.timelineSnapshot = createTimelineSnapshot(gameState, event.time);
  gameState.isPlaying = false;
  gameState.metaTimeToGameTimeOffset = 0;
  // TODO restore - if (wasPlaying) gameState.activeEffects.push(createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
}

function _updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent, metaTime:number) {
  // const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.metaTimeToGameTimeOffset = gameState.time - metaTime;
  } else {
    gameState.metaTimeToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
  }
  // TODO restore
  /* if (wasPlaying !== event.isPlaying) {
    gameState.activeEffects.push(event.isPlaying
      ? createPlayEffect(metaTime, gameState.scalingFactors.roomLineWidth)
      : createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
  } */
}

function _pauseGameState(gameState:GameState, _metaTime:number) {
  // const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = false;
  gameState.metaTimeToGameTimeOffset = 0;
  // TODO restore if (wasPlaying) gameState.activeEffects.push(createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
}

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeRoom = gameState.timelineSnapshot.activeRoom;
  if (!gameState.isLevelComplete && gameState.discoveryState.obscuredRoomIds.has(activeRoom.id)) return null;
  return activeRoom;
}

function _updateGameStateForMouseWheel(gameState:GameState, event:MouseWheelEvent) {
  if (event.deltaY === 0) return;
  const zoomDirection = -Math.sign(event.deltaY);
  if (zoomDirection === 0) return;
  gameState.camera.zoomAmount = clamp(gameState.camera.zoomAmount + zoomDirection * CAMERA_ZOOM_STEP, 0, 1);
}

function _updateGameState(gameState:GameState, events:PlayerEvent[], metaTime:number, cameraAspectRatio:number) {
  const snapshotCharacters = gameState.timelineSnapshot.characters;
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: _updateGameStateForChangeTime(gameState, event as ChangeTimeEvent, metaTime); break;
      case PlayerEventType.CHANGE_CONCLUSIONS: updateGameStateForChangeConclusions(gameState, event as ChangeConclusionsEvent); break;
      case PlayerEventType.NEXT_CHARACTER: break;
      case PlayerEventType.PLAY_PAUSE: _updateGameStateForPlayPause(gameState, event as PlayPauseEvent, metaTime); break;
      case PlayerEventType.MOUSEDOWN: updateGameStateForMouseDown(gameState, snapshotCharacters, event as MouseDownEvent, metaTime); break;
      case PlayerEventType.MOUSEMOVE: updateGameStateForMouseMove(gameState, snapshotCharacters, event as MouseMoveEvent); break;
      case PlayerEventType.MOUSEWHEEL: _updateGameStateForMouseWheel(gameState, event as MouseWheelEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    const endTime = gameState.startTime + gameState.duration;
    const nextTime = Math.min(endTime, metaTime + gameState.metaTimeToGameTimeOffset);
    gameState.time = nextTime;
    gameState.timelineSnapshot = createTimelineSnapshot(gameState, nextTime);
    if (nextTime >= endTime) _pauseGameState(gameState, metaTime);
  }
  syncCameraTargetToActiveRoom(gameState.camera, gameState.baseRooms, gameState.timelineSnapshot.activeRoom,
    cameraAspectRatio, metaTime, gameState.groundFloorY);
  updateCamera(gameState.camera, metaTime);
  _setActiveRoomDiscovered(gameState);
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

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D,
    onMinutesChanged:(minutes:number) => void, onIsPlayingChanged?:(isPlaying:boolean) => void,
    onActiveCharacterChanged?:(characterId:string) => void, onConclusionsChanged?:(conclusions:Conclusion[]) => void,
    _isScrubbing:boolean = false, onDiscoveriesChanged?:(discoveries:Discoveries) => void) {
  
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  _clearCanvas(gameState, context);

  const metaTime = findMetaTimeNow();
  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events, metaTime, calcCanvasAspectRatio(context));
  syncConclusionUnlocks(gameState);
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
  if (DRAW_FPS_COUNTER) updateAndDrawFps(metaTime, context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const baseItemsById = createItemsById(level.rooms, level.characters, duplicateItemsById(level.itemsById));
  const baseCharacters = level.characters.map(character => duplicateCharacterUsingItemIndex(character, baseItemsById));
  const baseRooms = level.rooms.map(room => duplicateRoomUsingItemIndex(room, baseItemsById));
  const duration = level.endTime - level.startTime;
  const gameState:GameState = {
    activeCharacterId:level.activeCharacterId,
    backgroundImageUrl:level.backgroundImageUrl,
    baseCharacters,
    baseItemsById,
    baseRooms,
    camera:createCamera(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY)),
    conclusions:level.conclusions.map(duplicateConclusion),
    conclusionsRevision:0,
    discoveryState:{
      discoveredSkinIds:new Set<string>(),
      discoveredItemIds:new Set<string>(),
      discoveredRoomIds:new Set<string>(),
      titleKnownCharacterIds:new Set(level.discoveryConfig.initiallyKnownTitleCharacterIds),
      obscuredRoomIds:new Set(level.discoveryConfig.initiallyObscuredRoomIds),
      discoverableCharacterCount:level.discoveryConfig.discoverableCharacterCount,
      discoverableItemCount:level.discoveryConfig.discoverableItemCount,
      discoverableRoomCount:level.discoveryConfig.discoverableRoomCount
    },
    duration,
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
    metaTimeToGameTimeOffset:0,
    roomShellCacheByRoomId:createEmptyRoomShellCache(),
    roomShellCacheKey:'',
    roomTitleWrapsByRoomId:new Map<string, string[]>(),
    roomTitleWrapScalingFactors:ZERO_SCALING_FACTORS,
    scalingFactors:ZERO_SCALING_FACTORS,
    startTime:level.startTime,
    time:level.initialTime,
    timeline:level.timeline, // Timeline is immutable and it is a large data structure - no harm in sharing instance.
    timelineSnapshot:createInitialTimelineSnapshot(baseCharacters, baseRooms, level.timeline,
      level.activeCharacterId, level.initialTime),
    viewedItemIds:new Set<string>(),
    winSynopsis:level.winSynopsis,
  }
  _setActiveRoomDiscovered(gameState);
  syncConclusionUnlocks(gameState);
  return gameState;
}