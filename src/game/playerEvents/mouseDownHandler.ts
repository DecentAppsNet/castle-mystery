/* This file handles pointer selection of interactive characters and room navigation.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Character from "../types/Character";
import GameState from "../types/GameState";
import MouseDownEvent from "./types/MouseDownEvent";
import Position from "../types/Position";
import CharacterWithEffects from "../types/CharacterWithEffects";
import Room from "../types/Room";
import { createCharacterKeyframeAtTime, createTimelineSnapshot, findRoomNavigationTarget } from "../timeline";
import { findActiveVisibleRoom, findVisibleHoveredRoom, findHoveredRoomContent, findNavigableRoomAtPosition } from "./hoverStateUtil";
import { selectCharacter } from "./characterSelectionUtil";
import { updateGameStateForChangeTime } from "./changeTimeHandler";
import { updateGameStateForMouseMove } from "./mouseMoveHandler";
import PlayerEventType from "./types/PlayerEventType";

function _findInteractiveCharacterContentAtPosition(gameState:GameState, characters:CharacterWithEffects[], x:number, y:number):
  { type:'character', character:Character, displayPosition:Position }|null {
  const interactionRoom = gameState.isLevelComplete
    ? findVisibleHoveredRoom(gameState, x, y)
    : findActiveVisibleRoom(gameState);
  if (!interactionRoom && !gameState.isLevelComplete) {
    if (gameState.discoveryState.obscuredRoomIds.has(gameState.timelineSnapshot.activeRoom.id)) return null;
  }
  const hoveredContent = interactionRoom ? findHoveredRoomContent(gameState, interactionRoom, characters, x, y) : null;
  return hoveredContent?.type === 'character' ? hoveredContent : null;
}

function _navigateToRoom(gameState:GameState, room:Room, event:MouseDownEvent, metaTime:number) {
  // Preview the destination under the selected identity's existing skin-discovery rules.
  const target = findRoomNavigationTarget(gameState.timeline, gameState.baseRooms, gameState.activeCharacterId, room.id, gameState.time);
  if (!target) return;
  const changesIdentity = target.characterId !== gameState.activeCharacterId;
  const activeSkinIdAtSelection = changesIdentity
    ? createCharacterKeyframeAtTime(gameState.timeline.keyframes, gameState.timeline.characterIdToI[target.characterId], target.time).skinId
    : gameState.activeSkinIdAtSelection;
  const snapshot = createTimelineSnapshot({ ...gameState, activeCharacterId:target.characterId, activeSkinIdAtSelection }, target.time);
  if (snapshot.activeRoom.id !== room.id) return;

  // Commit time through the standard playback policy before recording destination selection.
  updateGameStateForChangeTime(gameState, { type:PlayerEventType.CHANGE_TIME, time:target.time }, metaTime);
  gameState.timelineSnapshot = snapshot;
  if (changesIdentity) selectCharacter(gameState, snapshot.characters, snapshot.activeCharacter, metaTime);
  updateGameStateForMouseMove(gameState, snapshot.characters, { type:PlayerEventType.MOUSEMOVE, x:event.x, y:event.y });
}

export function updateGameStateForMouseDown(gameState:GameState, snapshotCharacters:CharacterWithEffects[], event:MouseDownEvent, metaTime:number) {
  const characterContent = _findInteractiveCharacterContentAtPosition(gameState, snapshotCharacters, event.x, event.y);
  if (characterContent) {
    selectCharacter(gameState, snapshotCharacters, characterContent.character, metaTime);
    return;
  }

  // Character selection takes priority; popup content and exits do not block room navigation.
  const room = findNavigableRoomAtPosition(gameState, event.x, event.y);
  if (room) _navigateToRoom(gameState, room, event, metaTime);
}