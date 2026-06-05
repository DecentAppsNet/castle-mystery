/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable, botch } from "decent-portal";
import Character from "./types/Character";
import GameState from "./types/GameState";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import ChangeSolutionsEvent from "./types/playerEvents/ChangeSolutionsEvent";
import NextCharacterEvent from "./types/playerEvents/NextCharacterEvent";
import { findCharacterPose } from "./itineraryUtil";
import { findCharactersInRoom, findRoomAtPosition, isActiveAudibleRoom } from "./roomUtil";
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
import { COLOR_BLACK } from "./drawing/drawConstants";
import { drawGameState, updateScalingFactorsAsNeeded } from "./drawing/gameStateDrawUtil";
import { createPauseEffect, createPlayEffect } from "./effects/playPauseEffectUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import { createSpeechBubbleEffect } from "./effects/speechBubbleEffectUtil";
import { createThoughtBubbleEffect } from "./effects/thoughtBubbleEffectUtil";
import Solution, { duplicateSolution } from "./solutions/types/Solution";
import ImageSet from "./types/ImageSet";
import { createEmptyImageSet } from "./imageSetUtil";
import { createItemsById, duplicateCharacterUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import EffectType from "./effects/types/EffectType";
import {
  callOnActiveCharacterChangedAsNeeded,
  callOnMinutesChangedAsNeeded,
  callOnSolutionsChangedAsNeeded
} from "./gameStateNotificationUtil";
import { updateGameStateForMouseDown, updateGameStateForMouseMove } from "./hoverStateUtil";
import { syncSolutionUnlocks, updateGameStateForChangeSolutions } from "./solutionStateUtil";
import { rebuildDynamicStateForTime } from "./dynamicStateRebuildUtil";
import { normalizeId } from "./idUtil";
import { calcRoomsBoundingRectWithRoofs } from "./roomRoofUtil";
import { clamp } from "@/common/numberUtil";

const CAMERA_ZOOM_STEP = 0.1;

export function findCharacter(gameState:GameState, characterRef:string):Character {
  const characterId = normalizeId(characterRef);
  const character = gameState.characters.find((c) => c.id === characterId);
  assertNonNullable(character, `character with id ${characterRef} not found`);
  return character;
}

function _setActiveRoomDiscovered(gameState:GameState) {
  if (gameState.isLevelComplete) return;
  const activeCharacter = gameState.characters[gameState.activeCharacterI];
  if (activeCharacter) {
    const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y);
    if (activeRoom) {
      if (!activeRoom.isDiscovered) activeRoom.isDiscovered = true;
      if (!activeCharacter.discoveredRoomIds.includes(activeRoom.id)) {
        activeCharacter.discoveredRoomIds = [...activeCharacter.discoveredRoomIds, activeRoom.id];
      }
    }
  }
}

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent) {
  const wasPlaying = gameState.isPlaying;
  gameState.activeEffects.length = 0;
  rebuildDynamicStateForTime(gameState, event.time);
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(Date.now(), gameState.scalingFactors.roomLineWidth));
}

function _updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent) {
  const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.realTimeToGameTimeOffset = gameState.time - Date.now();
  } else {
    gameState.realTimeToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
  }
  if (wasPlaying !== event.isPlaying) {
    gameState.activeEffects.push(event.isPlaying
      ? createPlayEffect(Date.now(), gameState.scalingFactors.roomLineWidth)
      : createPauseEffect(Date.now(), gameState.scalingFactors.roomLineWidth));
  }
}

function _pauseGameState(gameState:GameState) {
  const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.activeEffects.push(createPauseEffect(Date.now(), gameState.scalingFactors.roomLineWidth));
}

function _compareCharactersForCycleOrder(character1:Character, character2:Character) {
  return character1.y - character2.y || character1.x - character2.x;
}

function _updateGameStateForNextCharacter(gameState:GameState, _event:NextCharacterEvent) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  if (!activeCharacter) return;
  const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y);
  if (!activeRoom || (activeRoom.isObscured && !gameState.isLevelComplete)) return;
  const charactersInRoom = findCharactersInRoom(activeRoom, gameState.characters)
    .sort(_compareCharactersForCycleOrder);
  if (charactersInRoom.length <= 1) return;

  const activeCharacterIndex = charactersInRoom.findIndex(character => character.id === activeCharacter.id);
  if (activeCharacterIndex === -1) return;
  const nextCharacter = charactersInRoom[(activeCharacterIndex + 1) % charactersInRoom.length];
  if (nextCharacter.id === activeCharacter.id) return;
  gameState.activeCharacterI = gameState.characters.indexOf(nextCharacter);
  gameState.activeEffects.push(createCharacterSelectEffect(nextCharacter, Date.now(), gameState.scalingFactors));
}

function _updateGameStateForMouseWheel(gameState:GameState, event:MouseWheelEvent) {
  if (event.deltaY === 0) return;
  const zoomDirection = -Math.sign(event.deltaY);
  if (zoomDirection === 0) return;
  gameState.camera.zoomAmount = clamp(gameState.camera.zoomAmount + zoomDirection * CAMERA_ZOOM_STEP, 0, 1);
}

function _updateGameState(gameState:GameState, events:PlayerEvent[], now:number, cameraAspectRatio:number) {
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: _updateGameStateForChangeTime(gameState, event as ChangeTimeEvent); break;
      case PlayerEventType.CHANGE_SOLUTIONS: updateGameStateForChangeSolutions(gameState, event as ChangeSolutionsEvent); break;
      case PlayerEventType.NEXT_CHARACTER: _updateGameStateForNextCharacter(gameState, event as NextCharacterEvent); break;
      case PlayerEventType.PLAY_PAUSE: _updateGameStateForPlayPause(gameState, event as PlayPauseEvent); break;
      case PlayerEventType.MOUSEDOWN: updateGameStateForMouseDown(gameState, event as MouseDownEvent); break;
      case PlayerEventType.MOUSEMOVE: updateGameStateForMouseMove(gameState, event as MouseMoveEvent); break;
      case PlayerEventType.MOUSEWHEEL: _updateGameStateForMouseWheel(gameState, event as MouseWheelEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    const previousTime = gameState.time;
    const endTime = gameState.startTime + gameState.duration;
    const nextTime = Math.min(endTime, now + gameState.realTimeToGameTimeOffset);
    rebuildDynamicStateForTime(gameState, nextTime, previousTime);
    if (nextTime >= endTime) _pauseGameState(gameState);
  }
  syncCameraTargetToActiveRoom(gameState.camera, gameState.rooms, gameState.characters[gameState.activeCharacterI] || null,
    cameraAspectRatio, now, gameState.groundFloorY);
  updateCamera(gameState.camera, now);
  _setActiveRoomDiscovered(gameState);
}

function _syncSpeechBubbleEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.SPEECH_BUBBLE);

  if (!gameState.isPlaying && !isScrubbing) return;

  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeRoom || (activeRoom.isObscured && !gameState.isLevelComplete)) return;

  const audibleRooms = gameState.isLevelComplete
    ? [activeRoom]
    : gameState.rooms.filter(room => isActiveAudibleRoom(room, activeRoom));

  audibleRooms.flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const speech = findCharacterPose(character, gameState.time).speech;
    if (!speech) return;
    gameState.activeEffects.push(createSpeechBubbleEffect(character, speech, gameState.scalingFactors, gameState.time));
  });
}

function _syncThoughtBubbleEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.THOUGHT_BUBBLE);

  if (!gameState.isLevelComplete && !gameState.isPlaying && !isScrubbing) return;

  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!gameState.isLevelComplete && (!activeRoom || activeRoom.isObscured)) return;

  const visibleRooms = gameState.isLevelComplete
    ? gameState.rooms.filter(room => room.isDiscovered)
    : activeRoom ? [activeRoom] : [];

  visibleRooms.flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const thought = findCharacterPose(character, gameState.time).thought;
    if (!thought) return;
    gameState.activeEffects.push(createThoughtBubbleEffect(character, thought, gameState.scalingFactors, gameState.time));
  });
}

function _findCharacterI(characters:Character[], characterRef:string):number {
  const characterId = normalizeId(characterRef);
  for(let i = 0; i < characters.length; ++i) {
    if (characters[i].id === characterId) return i;
  }
  return -1;
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

  const backgroundImage = gameState.imageSet.get(gameState.backgroundImageUrl) || null;
  if (!backgroundImage) {
    _fillCanvasBlack(context);
    return;
  }

  _drawBackgroundImageToCanvas(backgroundImage, context);
}

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D,
  onMinutesChanged:(minutes:number) => void, onIsPlayingChanged?:(isPlaying:boolean) => void,
  onActiveCharacterChanged?:(characterId:string) => void, onSolutionsChanged?:(solutions:Solution[]) => void, isScrubbing:boolean = false) {
  _clearCanvas(gameState, context);
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  const now = Date.now();
  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events, now, calcCanvasAspectRatio(context));
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);
  if (onActiveCharacterChanged) callOnActiveCharacterChangedAsNeeded(gameState, onActiveCharacterChanged);
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  context.canvas.style.cursor = (gameState.isLevelComplete || !activeRoom?.isObscured) && gameState.hoveredCharacterId && gameState.hoveredCharacterId !== gameState.characters[gameState.activeCharacterI]?.id
    ? "pointer"
    : gameState.hoveredRoomId ? "pointer" : "default";

  updateScalingFactorsAsNeeded(gameState, context);
  _syncSpeechBubbleEffects(gameState, isScrubbing);
  _syncThoughtBubbleEffects(gameState, isScrubbing);
  syncSolutionUnlocks(gameState);
  if (onSolutionsChanged) callOnSolutionsChangedAsNeeded(gameState, onSolutionsChanged);
  drawGameState(gameState, context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const initialItemsById = createItemsById(level.rooms, level.initialCharacters, duplicateItemsById(level.itemsById));
  const itemsById = duplicateItemsById(initialItemsById);
  const gameState:GameState = {
    characters:level.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, itemsById)),
    rooms:level.rooms.map(room => duplicateRoomUsingItemIndex(room, itemsById)),
    itemsById,
    solutions:level.solutions.map(duplicateSolution),
    winSynopsis:level.winSynopsis,
    backgroundImageUrl:level.backgroundImageUrl,
    groundFloorY:level.groundFloorY,
    imageSet,
    initialItemsById,
    initialCharacters:level.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, initialItemsById)),
    initialRooms:level.rooms.map(room => duplicateRoomUsingItemIndex(room, initialItemsById)),
    camera:createCamera(calcRoomsBoundingRectWithRoofs(level.rooms, level.groundFloorY)),
    activeEffects:[],
    hoveredItemId:null,
    hoveredCharacterId:null,
    hoveredExitKey:null,
    hoveredRoomId:null,
    viewedItemIds:new Set<string>(),
    activeCharacterI:_findCharacterI(level.characters, level.activeCharacterId),
    isLevelComplete:false,
    isPlaying:false,
    time:level.initialTime,
    startTime:level.startTime,
    duration:level.duration,
    realTimeToGameTimeOffset:0,
    labels:level.labels.map(label => ({...label})),
    scalingFactors:ZERO_SCALING_FACTORS,
    roomTitleWrapScalingFactors:ZERO_SCALING_FACTORS,
    roomTitleWrapsByRoomId:new Map<string, string[]>(),
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN,
    lastActiveCharacterChangedValue:"",
    solutionsRevision:0,
    lastNotifiedSolutionsRevision:0
  }
  rebuildDynamicStateForTime(gameState, level.initialTime);
  _setActiveRoomDiscovered(gameState);
  syncSolutionUnlocks(gameState);
  return gameState;
}