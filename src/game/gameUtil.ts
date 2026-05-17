/* This module groups top-level game state orchestration, coordinating input events, simulation updates, drawing, and outward callbacks. */

import { assertNonNullable, botch } from "decent-portal";
import Character, { duplicateCharacter } from "./types/Character";
import GameState from "./types/GameState";
import Room, { duplicateRoom } from "./types/Room";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import ChangeSolutionsEvent from "./types/playerEvents/ChangeSolutionsEvent";
import NextCharacterEvent from "./types/playerEvents/NextCharacterEvent";
import { findCharacterPose } from "./itineraryUtil";
import { findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import { ZERO_SCALING_FACTORS } from "./drawing/drawUtil";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import { COLOR_BLACK } from "./drawing/drawConstants";
import { drawGameState, updateScalingFactorsAsNeeded } from "./drawing/gameStateDrawUtil";
import { createPauseEffect, createPlayEffect } from "./effects/playPauseEffectUtil";
import { createCharacterSelectEffect } from "./effects/characterSelectEffectUtil";
import { createSpeechBubbleEffect } from "./effects/speechBubbleEffectUtil";
import Solution, { duplicateSolution } from "./solutions/types/Solution";
import ImageSet from "./types/ImageSet";
import { createEmptyImageSet } from "./imageSetUtil";
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
import ExitStatus from "./types/ExitStatus";

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
    if (activeRoom) activeRoom.isDiscovered = true;
  }
}

function _isActiveAudibleRoom(room:Room, activeRoom:Room):boolean {
  if (room.id === activeRoom.id) return true;
  if (room.isObscured) return false;
  return room.exits.some(exit =>
    exit.exitStatus === ExitStatus.open
    && (exit.room1Id === activeRoom.id || exit.room2Id === activeRoom.id));
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

function _updateGameState(gameState:GameState, events:PlayerEvent[]) {
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: _updateGameStateForChangeTime(gameState, event as ChangeTimeEvent); break;
      case PlayerEventType.CHANGE_SOLUTIONS: updateGameStateForChangeSolutions(gameState, event as ChangeSolutionsEvent); break;
      case PlayerEventType.NEXT_CHARACTER: _updateGameStateForNextCharacter(gameState, event as NextCharacterEvent); break;
      case PlayerEventType.PLAY_PAUSE: _updateGameStateForPlayPause(gameState, event as PlayPauseEvent); break;
      case PlayerEventType.MOUSEDOWN: updateGameStateForMouseDown(gameState, event as MouseDownEvent); break;
      case PlayerEventType.MOUSEMOVE: updateGameStateForMouseMove(gameState, event as MouseMoveEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    const previousTime = gameState.time;
    const nextTime = Math.min(gameState.duration, Date.now() + gameState.realTimeToGameTimeOffset);
    rebuildDynamicStateForTime(gameState, nextTime, previousTime);
    if (nextTime >= gameState.duration) _pauseGameState(gameState);
  }
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
    : gameState.rooms.filter(room => _isActiveAudibleRoom(room, activeRoom));

  audibleRooms.flatMap(room => findCharactersInRoom(room, gameState.characters)).forEach(character => {
    const speech = findCharacterPose(character, gameState.time).speech;
    if (!speech) return;
    gameState.activeEffects.push(createSpeechBubbleEffect(character, speech, gameState.scalingFactors, gameState.time));
  });
}

function _findCharacterI(characters:Character[], characterRef:string):number {
  const characterId = normalizeId(characterRef);
  for(let i = 0; i < characters.length; ++i) {
    if (characters[i].id === characterId) return i;
  }
  return -1;
}

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D,
  onMinutesChanged:(minutes:number) => void, onIsPlayingChanged?:(isPlaying:boolean) => void,
  onActiveCharacterChanged?:(characterId:string) => void, onSolutionsChanged?:(solutions:Solution[]) => void, isScrubbing:boolean = false) {
  context.fillStyle = COLOR_BLACK;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  if (!gameState) {
    context.canvas.style.cursor = "default";
    return;
  }

  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events);
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);
  if (onActiveCharacterChanged) callOnActiveCharacterChangedAsNeeded(gameState, onActiveCharacterChanged);
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  context.canvas.style.cursor = (gameState.isLevelComplete || !activeRoom?.isObscured) && gameState.hoveredCharacterId && gameState.hoveredCharacterId !== gameState.characters[gameState.activeCharacterI]?.id
    ? "pointer"
    : "default";

  updateScalingFactorsAsNeeded(gameState, context);
  _syncSpeechBubbleEffects(gameState, isScrubbing);
  syncSolutionUnlocks(gameState);
  if (onSolutionsChanged) callOnSolutionsChangedAsNeeded(gameState, onSolutionsChanged);
  drawGameState(gameState, context);
}

export function createGameState(level:Level, imageSet:ImageSet = createEmptyImageSet()):GameState {
  const gameState:GameState = {
    characters:level.initialCharacters.map(duplicateCharacter),
    rooms:level.rooms.map(duplicateRoom),
    solutions:level.solutions.map(duplicateSolution),
    winSynopsis:level.winSynopsis,
    imageSet,
    initialCharacters:level.initialCharacters.map(duplicateCharacter),
    initialRooms:level.rooms.map(duplicateRoom),
    activeEffects:[],
    hoveredItemId:null,
    hoveredCharacterId:null,
    hoveredExitKey:null,
    viewedItemIds:new Set<string>(),
    activeCharacterI:_findCharacterI(level.characters, level.activeCharacterId),
    isLevelComplete:false,
    isPlaying:false,
    time:level.startTime,
    duration:level.duration,
    realTimeToGameTimeOffset:0,
    labels:level.labels.map(label => ({...label})),
    scalingFactors:ZERO_SCALING_FACTORS,
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN,
    lastActiveCharacterChangedValue:"",
    solutionsRevision:0,
    lastNotifiedSolutionsRevision:0
  }
  rebuildDynamicStateForTime(gameState, level.startTime);
  _setActiveRoomDiscovered(gameState);
  syncSolutionUnlocks(gameState);
  return gameState;
}