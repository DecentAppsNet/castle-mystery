/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";
import GameState from "./types/GameState";
import Room from "./types/Room";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import ChangeConclusionsEvent from "./types/playerEvents/ChangeConclusionsEvent";
import { findRoomAtPosition } from "./roomUtil";
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
import { createPauseEffect, createPlayEffect } from "./effects/playPauseEffectUtil";
import { findImageBitmap } from "./imageAssetUtil";
import Conclusion, { duplicateConclusion } from "./conclusions/types/Conclusion";
import ImageSet from "./types/ImageSet";
import { createEmptyImageSet } from "./imageSetUtil";
import { createItemsById, createUnplacedItemsById, duplicateCharacterUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { MAX_ACTIVE_EFFECTS } from "./effects/effectUtil";
import {
  callOnActiveCharacterChangedAsNeeded,
  callOnDiscoveriesChangedAsNeeded,
  callOnMinutesChangedAsNeeded,
  callOnConclusionsChangedAsNeeded
} from "./gameStateNotificationUtil";
import { updateGameStateForMouseDown, updateGameStateForMouseMove } from "./hoverStateUtil";
import { syncConclusionUnlocks, updateGameStateForChangeConclusions } from "./conclusionStateUtil";
import { syncDiscoveries } from "./discoveriesUtil";
import { calcRenderedRoomsBoundingRect } from "./roomRoofUtil";
import { clamp } from "@/common/numberUtil";
import Discoveries, { createEmptyDiscoveries } from "./types/Discoveries";
import { createEmptyRoomShellCache } from "./types/RoomShellCache";
import { DRAW_FPS_COUNTER } from "@/developer/config";
import { updateAndDrawFps } from "@/developer/fpsUtil";
import { findActiveCharacter } from "./activeCharacterUtil";
import { createTimelineSnapshot, createInitialTimelineSnapshot } from "./timeline";
import { calc24HourTimeDuration } from "@/common/timeUtil";

const CAMERA_ZOOM_STEP = 0.1;

function _findMetaTimeNow():number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function _setActiveRoomDiscovered(gameState:GameState) {
  const activeCharacter = findActiveCharacter(gameState);
  if (activeCharacter) {
    const activeRoom = findRoomAtPosition(gameState.baseRooms, activeCharacter.position.x, activeCharacter.position.y);
    if (activeRoom) {
      if (!activeRoom.isDiscovered) {
        const snapshotRoom = gameState.timelineSnapshot.rooms.find(r => r.id === activeRoom.id);
        assertNonNullable(snapshotRoom);
        snapshotRoom.isDiscovered = activeRoom.isDiscovered = true;
      }
    }
  }
}

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent, metaTime:number) {
  const wasPlaying = gameState.isPlaying;
  gameState.activeEffects.length = 0;
  gameState.timelineSnapshot = createTimelineSnapshot(gameState, event.time);
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
}

function _updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent, metaTime:number) {
  const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.realTimeToGameTimeOffset = gameState.time - Date.now();
  } else {
    gameState.realTimeToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
  }
  if (wasPlaying !== event.isPlaying) {
    gameState.activeEffects.push(event.isPlaying
      ? createPlayEffect(metaTime, gameState.scalingFactors.roomLineWidth)
      : createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
  }
}

function _pauseGameState(gameState:GameState, metaTime:number) {
  const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(metaTime, gameState.scalingFactors.roomLineWidth));
}

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeCharacter = findActiveCharacter(gameState);
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.baseRooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (!activeRoom || (!gameState.isLevelComplete && activeRoom.isObscured)) return null;
  return activeRoom;
}

function _updateGameStateForMouseWheel(gameState:GameState, event:MouseWheelEvent) {
  if (event.deltaY === 0) return;
  const zoomDirection = -Math.sign(event.deltaY);
  if (zoomDirection === 0) return;
  gameState.camera.zoomAmount = clamp(gameState.camera.zoomAmount + zoomDirection * CAMERA_ZOOM_STEP, 0, 1);
}

function _updateGameState(gameState:GameState, events:PlayerEvent[], now:number, metaTime:number, cameraAspectRatio:number) {
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
    const nextTime = Math.min(endTime, now + gameState.realTimeToGameTimeOffset);
    gameState.timelineSnapshot = createTimelineSnapshot(gameState, nextTime);
    if (nextTime >= endTime) _pauseGameState(gameState, metaTime);
  }
  syncCameraTargetToActiveRoom(gameState.camera, gameState.baseRooms, findActiveCharacter(gameState),
    cameraAspectRatio, now, gameState.groundFloorY);
  updateCamera(gameState.camera, now);
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
  _clearCanvas(gameState, context);
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  const now = Date.now();
  const metaTime = _findMetaTimeNow();
  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events, now, metaTime, calcCanvasAspectRatio(context));
  syncConclusionUnlocks(gameState);
  syncDiscoveries(gameState);
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);
  if (onActiveCharacterChanged) callOnActiveCharacterChangedAsNeeded(gameState, onActiveCharacterChanged);
  const activeVisibleRoom = _findActiveVisibleRoom(gameState);
  context.canvas.style.cursor = activeVisibleRoom && gameState.hoveredCharacterId && gameState.hoveredCharacterId !== gameState.activeCharacterId
    ? "pointer"
    : gameState.hoveredRoomId ? "pointer" : "default";

  updateScalingFactorsAsNeeded(gameState, context);
  assert(gameState.activeEffects.length <= MAX_ACTIVE_EFFECTS,
    `active effect count ${gameState.activeEffects.length} exceeds MAX_ACTIVE_EFFECTS ${MAX_ACTIVE_EFFECTS}; an effect callback may not be returning false to remove itself`);
  if (onConclusionsChanged) callOnConclusionsChangedAsNeeded(gameState, onConclusionsChanged);
  if (onDiscoveriesChanged) callOnDiscoveriesChangedAsNeeded(gameState, onDiscoveriesChanged);
  drawGameState(gameState, context, metaTime);
  if (DRAW_FPS_COUNTER) updateAndDrawFps(metaTime, context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const initialItemsById = createItemsById(level.rooms, level.characters, duplicateItemsById(level.itemsById));
  const baseCharacters = level.characters.map(character => duplicateCharacterUsingItemIndex(character, initialItemsById));
  const baseRooms = level.rooms.map(room => duplicateRoomUsingItemIndex(room, initialItemsById));
  const initialUnplacedItemsById = createUnplacedItemsById(initialItemsById, baseRooms, baseCharacters);
  const itemsById = duplicateItemsById(initialItemsById);
  const characters = level.characters.map(character => duplicateCharacterUsingItemIndex(character, itemsById));
  const rooms = level.rooms.map(room => duplicateRoomUsingItemIndex(room, itemsById));
  const duration = calc24HourTimeDuration(level.startTime, level.endTime);
  const gameState:GameState = {
    itemsById,
    unplacedItemsById:createUnplacedItemsById(itemsById, rooms, characters),
    discoveredCharacterIds:[],
    discoveredItemIds:[],
    discoverableCharacterCount:level.discoverableCharacterCount,
    discoverableItemCount:level.discoverableItemCount,
    discoverableRoomCount:level.discoverableRoomCount,
    conclusions:level.conclusions.map(duplicateConclusion),
    winSynopsis:level.winSynopsis,
    backgroundImageUrl:level.backgroundImageUrl,
    groundFloorY:level.groundFloorY,
    imageSet,
    initialItemsById,
    initialUnplacedItemsById,
    baseCharacters,
    baseRooms,
    camera:createCamera(calcRenderedRoomsBoundingRect(level.rooms, level.groundFloorY)),
    activeEffects:[],
    hoveredItemId:null,
    hoveredCharacterId:null,
    hoveredExitKey:null,
    hoveredRoomId:null,
    viewedItemIds:new Set<string>(),
    activeCharacterId:level.activeCharacterId,
    isLevelComplete:false,
    isPlaying:false,
    time:level.initialTime,
    startTime:level.startTime,
    duration,
    realTimeToGameTimeOffset:0,
    labels:level.labels.map(label => ({...label})),
    scalingFactors:ZERO_SCALING_FACTORS,
    roomTitleWrapScalingFactors:ZERO_SCALING_FACTORS,
    roomTitleWrapsByRoomId:new Map<string, string[]>(),
    roomShellCacheByRoomId:createEmptyRoomShellCache(),
    roomShellCacheKey:'',
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN,
    lastActiveCharacterChangedValue:"",
    conclusionsRevision:0,
    lastNotifiedConclusionsRevision:0,
    lastNotifiedDiscoveriesKey:JSON.stringify(createEmptyDiscoveries()),
    timeline:level.timeline, // Timeline is immutable - no harm in sharing instance.
    timelineSnapshot:createInitialTimelineSnapshot(baseCharacters, baseRooms)
  }
  _setActiveRoomDiscovered(gameState);
  syncDiscoveries(gameState);
  syncConclusionUnlocks(gameState);
  return gameState;
}