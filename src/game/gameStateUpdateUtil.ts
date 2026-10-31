/* This file advances game simulation state from player events and explicit frame timestamps without drawing.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { botch } from "decent-portal";
import GameState from "./types/GameState";
import ChangeTimeEvent from "./playerEvents/types/ChangeTimeEvent";
import ChangeConclusionsEvent from "./playerEvents/types/ChangeConclusionsEvent";
import PlayerEvent from "./playerEvents/types/PlayerEvent";
import PlayerEventType from "./playerEvents/types/PlayerEventType";
import PlayPauseEvent from "./playerEvents/types/PlayPauseEvent";
import MouseDownEvent from "./playerEvents/types/MouseDownEvent";
import MouseMoveEvent from "./playerEvents/types/MouseMoveEvent";
import MouseWheelEvent from "./playerEvents/types/MouseWheelEvent";
import { syncCameraTargetToActiveRoom, updateCamera } from "./cameraUtil";
import {
  updateGameStateForChangeTime,
  updateGameStateForChangeConclusions,
  updateGameStateForPlayPause,
  updateGameStateForMouseWheel,
  updateGameStateForMouseDown,
  updateGameStateForMouseMove,
  updateGameStateForNextCharacter
} from './playerEvents';
import { createTimelineSnapshot } from "./timeline";
import { findMetaTimeNow } from "./metaTimeUtil";
import { removeExpiredCharacterMetaTimeEffects, removeExpiredMetaTimeEffects } from "./effects/metaTimeEffectUtil";
import { createPauseEffect } from "./effects/playPauseEffectUtil";

function _pauseGameState(gameState:GameState, metaTime:number) {
  const wasPlaying = gameState.isPlaying;
  gameState.isPlaying = false;
  gameState.metaTimeToGameTimeOffset = 0;
  if (wasPlaying) gameState.metaTimeEffects.push(createPauseEffect(metaTime));
}

// Use only when playback must stop synchronously because the RAF update loop is about to be suspended.
// Normal gameplay changes must use player events so game state remains owned by the RAF update loop.
export function pauseGameState(gameState:GameState) {
  _pauseGameState(gameState, findMetaTimeNow());
}

function _removeExpiredEffects(gameState:GameState, metaTime:number) {
  removeExpiredMetaTimeEffects(gameState.metaTimeEffects, metaTime);
  removeExpiredCharacterMetaTimeEffects(gameState.characterMetaTimeEffectsByCharacterId, metaTime);
}

export function updateGameState(gameState:GameState, events:PlayerEvent[], metaTime:number, cameraAspectRatio:number) {
  // Remove ended effects before events can create effects at the current meta-time.
  _removeExpiredEffects(gameState, metaTime);

  // Apply current-frame player events.
  const snapshotCharacters = gameState.timelineSnapshot.characters;
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: updateGameStateForChangeTime(gameState, event as ChangeTimeEvent, metaTime); break;
      case PlayerEventType.CHANGE_CONCLUSIONS: updateGameStateForChangeConclusions(gameState, event as ChangeConclusionsEvent); break;
      case PlayerEventType.NEXT_CHARACTER: updateGameStateForNextCharacter(gameState, snapshotCharacters, metaTime); break;
      case PlayerEventType.PLAY_PAUSE: updateGameStateForPlayPause(gameState, event as PlayPauseEvent, metaTime); break;
      case PlayerEventType.MOUSEDOWN: updateGameStateForMouseDown(gameState, snapshotCharacters, event as MouseDownEvent, metaTime); break;
      case PlayerEventType.MOUSEMOVE: updateGameStateForMouseMove(gameState, snapshotCharacters, event as MouseMoveEvent); break;
      case PlayerEventType.MOUSEWHEEL: updateGameStateForMouseWheel(gameState, event as MouseWheelEvent); break;
      default: botch();
    }
  });

  // Advance timeline playback and pause at its end.
  if (gameState.isPlaying) {
    const endTime = gameState.timeline.endTime;
    const nextTime = Math.min(endTime, metaTime + gameState.metaTimeToGameTimeOffset);
    gameState.time = nextTime;
    if (nextTime >= endTime) _pauseGameState(gameState, metaTime);
  }

  // Create the frame's final snapshot, then update world state derived from it.
  gameState.timelineSnapshot = createTimelineSnapshot(gameState, gameState.time);
  syncCameraTargetToActiveRoom(gameState.camera, gameState.baseRooms, gameState.timelineSnapshot.activeRoom,
    cameraAspectRatio, metaTime, gameState.groundFloorY);
  updateCamera(gameState.camera, metaTime);
  gameState.discoveryState.discoveredRoomIds.add(gameState.timelineSnapshot.activeRoom.id);
}