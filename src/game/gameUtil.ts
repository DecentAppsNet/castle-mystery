/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";
import Character from "./types/Character";
import GameState from "./types/GameState";
import Room from "./types/Room";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import ChangeConclusionsEvent from "./types/playerEvents/ChangeConclusionsEvent";
import NextCharacterEvent from "./types/playerEvents/NextCharacterEvent";
import { findCharacterPose } from "./itineraryUtil";
import { findCharactersInRoom, findRoomAtPosition, isActiveAudibleRoom } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import EmitEvent from "./types/itineraryEvents/EmitEvent";
import ThoughtEvent from "./types/itineraryEvents/ThoughtEvent";
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
import { createEmitBubbleEffect } from "./effects/emitBubbleEffectUtil";
import { createThinkingEffect, THINKING_LOOK_UP_DURATION_MSECS } from "./effects/thinkingEffectUtil";
import { createTalkingEffect } from "./effects/talkingEffectUtil";
import { createThoughtBubbleEffect } from "./effects/thoughtBubbleEffectUtil";
import { isCharacterInteractive } from "./interactivityUtil";
import Conclusion, { duplicateConclusion } from "./conclusions/types/Conclusion";
import ImageSet from "./types/ImageSet";
import { createEmptyImageSet } from "./imageSetUtil";
import { createItemsById, duplicateCharacterUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { getOwnedItems } from "./itemOwnershipUtil";
import Item from "./types/Item";
import { MAX_ACTIVE_EFFECTS } from "./effects/effectUtil";
import EffectType from "./effects/types/EffectType";
import {
  callOnActiveCharacterChangedAsNeeded,
  callOnDiscoveriesChangedAsNeeded,
  callOnMinutesChangedAsNeeded,
  callOnConclusionsChangedAsNeeded
} from "./gameStateNotificationUtil";
import { updateGameStateForMouseDown, updateGameStateForMouseMove } from "./hoverStateUtil";
import { syncConclusionUnlocks, updateGameStateForChangeConclusions } from "./conclusionStateUtil";
import { syncDiscoveries } from "./discoveriesUtil";
import { rebuildDynamicStateForTime } from "./dynamicStateRebuildUtil";
import { normalizeId } from "./idUtil";
import { calcRoomsBoundingRectWithRoofs } from "./roomRoofUtil";
import { clamp } from "@/common/numberUtil";
import Discoveries, { createEmptyDiscoveries } from "./types/Discoveries";

const CAMERA_ZOOM_STEP = 0.1;

export function findCharacter(gameState:GameState, characterRef:string):Character {
  const characterId = normalizeId(characterRef);
  const character = gameState.characters.find((c) => c.id === characterId);
  assertNonNullable(character, `character with id ${characterRef} not found`);
  return character;
}

function _setActiveRoomDiscovered(gameState:GameState) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI];
  if (activeCharacter) {
    const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y);
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

function _findActiveSpeechEvent(character:Character, time:number):SpeechEvent|null {
  let activeSpeechEvent:SpeechEvent|null = null;
  for (const event of character.itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.SPEECH) continue;
    const speechEvent = event as SpeechEvent;
    activeSpeechEvent = time < speechEvent.startTime + speechEvent.duration ? speechEvent : null;
  }
  return activeSpeechEvent;
}

function _findThinkingEvent(character:Character, time:number):ThoughtEvent|null {
  let thinkingEvent:ThoughtEvent|null = null;
  for (const event of character.itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.THOUGHT) continue;
    const thoughtEvent = event as ThoughtEvent;
    thinkingEvent = time < thoughtEvent.startTime + thoughtEvent.duration + THINKING_LOOK_UP_DURATION_MSECS ? thoughtEvent : null;
  }
  return thinkingEvent;
}

function _findActiveEmitEvent(character:Character, time:number):EmitEvent|null {
  let activeEmitEvent:EmitEvent|null = null;
  for (const event of character.itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.EMIT) continue;
    const emitEvent = event as EmitEvent;
    activeEmitEvent = time < emitEvent.startTime + emitEvent.duration ? emitEvent : null;
  }
  return activeEmitEvent;
}

function _findEmitItemState(gameState:GameState, itemId:string):{ item:Item, room:Room, ownerCharacter:Character|null }|null {
  for (const room of gameState.rooms) {
    const item = room.items.find(candidate => candidate.id === itemId) || null;
    if (item) return { item, room, ownerCharacter:null };
  }
  for (const character of gameState.characters) {
    const item = getOwnedItems(character).find(candidate => candidate.id === itemId) || null;
    if (!item) continue;
    const room = findRoomAtPosition(gameState.rooms, character.position.x, character.position.y);
    if (!room) continue;
    return { item, room, ownerCharacter:character };
  }
  return null;
}

function _compareCharactersForCycleOrder(character1:Character, character2:Character) {
  return character1.position.z - character2.position.z || character1.position.x - character2.position.x;
}

function _findActiveVisibleRoom(gameState:GameState):Room|null {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (!activeRoom || (!gameState.isLevelComplete && activeRoom.isObscured)) return null;
  return activeRoom;
}

function _findVisibleRooms(gameState:GameState):Room[] {
  if (gameState.isLevelComplete) return gameState.rooms.filter(room => room.isDiscovered);
  const activeRoom = _findActiveVisibleRoom(gameState);
  return activeRoom ? [activeRoom] : [];
}

function _findSpeechEffectRooms(gameState:GameState):Room[] {
  if (gameState.isLevelComplete) return _findVisibleRooms(gameState);
  const activeRoom = _findActiveVisibleRoom(gameState);
  return activeRoom ? gameState.rooms.filter(room => isActiveAudibleRoom(room, activeRoom)) : [];
}

function _updateGameStateForNextCharacter(gameState:GameState, _event:NextCharacterEvent) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  if (!activeCharacter) return;
  const activeRoom = _findActiveVisibleRoom(gameState);
  if (!activeRoom) return;
  const charactersInRoom = findCharactersInRoom(activeRoom, gameState.characters)
    .filter(isCharacterInteractive)
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
      case PlayerEventType.CHANGE_CONCLUSIONS: updateGameStateForChangeConclusions(gameState, event as ChangeConclusionsEvent); break;
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

  _findSpeechEffectRooms(gameState).flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const speech = findCharacterPose(character, gameState.time).speech;
    if (!speech) return;
    gameState.activeEffects.push(createSpeechBubbleEffect(character, speech, gameState.scalingFactors, gameState.time));
  });
}

function _syncEmitBubbleEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.EMIT_BUBBLE);

  if (!gameState.isPlaying && !isScrubbing) return;

  const audibleRoomIds = new Set(_findSpeechEffectRooms(gameState).map(room => room.id));
  gameState.characters.forEach(character => {
    const activeEmitEvent = _findActiveEmitEvent(character, gameState.time);
    if (!activeEmitEvent) return;
    const emitItemState = _findEmitItemState(gameState, activeEmitEvent.itemId);
    if (!emitItemState || !audibleRoomIds.has(emitItemState.room.id)) return;
    gameState.activeEffects.push(createEmitBubbleEffect(
      emitItemState.room,
      emitItemState.item,
      emitItemState.ownerCharacter,
      activeEmitEvent.emitText,
      gameState.scalingFactors,
      gameState.time
    ));
  });
}

function _syncTalkingEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.TALKING);

  if (!gameState.isPlaying || isScrubbing) return;

  _findSpeechEffectRooms(gameState).flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const activeSpeechEvent = _findActiveSpeechEvent(character, gameState.time);
    if (!activeSpeechEvent) return;
    gameState.activeEffects.push(createTalkingEffect(
      character,
      activeSpeechEvent.startTime,
      activeSpeechEvent.startTime + activeSpeechEvent.duration,
      gameState.time
    ));
  });
}

function _syncThoughtBubbleEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.THOUGHT_BUBBLE);

  if (!gameState.isLevelComplete && !gameState.isPlaying && !isScrubbing) return;

  _findVisibleRooms(gameState).flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const thought = findCharacterPose(character, gameState.time).thought;
    if (!thought) return;
    gameState.activeEffects.push(createThoughtBubbleEffect(character, thought, gameState.scalingFactors, gameState.time));
  });
}

function _syncThinkingEffects(gameState:GameState, isScrubbing:boolean = false) {
  gameState.activeEffects = gameState.activeEffects.filter(effect => effect.type !== EffectType.THINKING);

  if (isScrubbing) return;

  _findVisibleRooms(gameState).flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const thinkingEvent = _findThinkingEvent(character, gameState.time);
    if (!thinkingEvent) return;
    gameState.activeEffects.push(createThinkingEffect(
      character,
      thinkingEvent.startTime,
      thinkingEvent.startTime + thinkingEvent.duration,
      gameState.time
    ));
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
  onActiveCharacterChanged?:(characterId:string) => void, onConclusionsChanged?:(conclusions:Conclusion[]) => void,
  isScrubbing:boolean = false, onDiscoveriesChanged?:(discoveries:Discoveries) => void) {
  _clearCanvas(gameState, context);
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  const now = Date.now();
  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events, now, calcCanvasAspectRatio(context));
  syncConclusionUnlocks(gameState);
  syncDiscoveries(gameState);
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);
  if (onActiveCharacterChanged) callOnActiveCharacterChangedAsNeeded(gameState, onActiveCharacterChanged);
  const activeVisibleRoom = _findActiveVisibleRoom(gameState);
  context.canvas.style.cursor = activeVisibleRoom && gameState.hoveredCharacterId && gameState.hoveredCharacterId !== gameState.characters[gameState.activeCharacterI]?.id
    ? "pointer"
    : gameState.hoveredRoomId ? "pointer" : "default";

  updateScalingFactorsAsNeeded(gameState, context);
  _syncSpeechBubbleEffects(gameState, isScrubbing);
  _syncEmitBubbleEffects(gameState, isScrubbing);
  _syncTalkingEffects(gameState, isScrubbing);
  _syncThoughtBubbleEffects(gameState, isScrubbing);
  _syncThinkingEffects(gameState, isScrubbing);
  assert(gameState.activeEffects.length <= MAX_ACTIVE_EFFECTS,
    `active effect count ${gameState.activeEffects.length} exceeds MAX_ACTIVE_EFFECTS ${MAX_ACTIVE_EFFECTS}; an effect callback may not be returning false to remove itself`);
  if (onConclusionsChanged) callOnConclusionsChangedAsNeeded(gameState, onConclusionsChanged);
  if (onDiscoveriesChanged) callOnDiscoveriesChangedAsNeeded(gameState, onDiscoveriesChanged);
  drawGameState(gameState, context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const initialItemsById = createItemsById(level.rooms, level.initialCharacters, duplicateItemsById(level.itemsById));
  const itemsById = duplicateItemsById(initialItemsById);
  const gameState:GameState = {
    characters:level.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, itemsById)),
    rooms:level.rooms.map(room => duplicateRoomUsingItemIndex(room, itemsById)),
    itemsById,
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
    conclusionsRevision:0,
    lastNotifiedConclusionsRevision:0,
    lastNotifiedDiscoveriesKey:JSON.stringify(createEmptyDiscoveries())
  }
  rebuildDynamicStateForTime(gameState, level.initialTime);
  _setActiveRoomDiscovered(gameState);
  syncDiscoveries(gameState);
  syncConclusionUnlocks(gameState);
  return gameState;
}