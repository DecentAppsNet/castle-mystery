/* This module groups time-based dynamic-state rebuilding, recreating mutable room and inventory state from the authored level timeline.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import { createDropItemEffect } from "./effects/dropItemUtil";
import { createGiveItemEffect } from "./effects/giveItemUtil";
import { createLockEffect, createUnlockEffect } from "./effects/lockEffectUtil";
import { createTakeItemEffect } from "./effects/takeItemUtil";
import { findCharacterPose } from "./itineraryUtil";
import { addOwnedItem, getOwnedItems, removeOwnedItemById } from "./itemOwnershipUtil";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import GameState from "./types/GameState";
import { duplicateCharacterUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { findRoomAtPosition } from "./roomUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import LockEvent from "./types/itineraryEvents/LockEvent";
import UnlockEvent from "./types/itineraryEvents/UnlockEvent";
import VisibilityEvent from "./types/itineraryEvents/VisibilityEvent";
import ExitStatus from "./types/ExitStatus";

type AppliedInventoryEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent
}

type AppliedExitStateEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:LockEvent|UnlockEvent
}

type AppliedVisibilityEvent = {
  characterId:string,
  eventIndex:number,
  event:VisibilityEvent
}

type PendingRoomEffect = {
  roomId:string,
  create:() => void
}

function _getDiscoveredRoomIds(gameState:GameState):Set<string> {
  return new Set(gameState.rooms.filter(room => room.isDiscovered).map(room => room.id));
}

function _getCharacterDiscoveredRoomIds(gameState:GameState):Map<string, string[]> {
  return new Map(gameState.characters.map(character => [character.id, [...character.discoveredRoomIds]]));
}

function _getDiscoveredCharacterIds(gameState:GameState):Set<string> {
  return new Set(gameState.discoveredCharacterIds);
}

function _getDiscoveredItemIds(gameState:GameState):Set<string> {
  const discoveredItemIds = new Set<string>();
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  return discoveredItemIds;
}

function _restoreDiscoveryState(gameState:GameState, discoveredRoomIds:Set<string>, discoveredItemIds:Set<string>,
  discoveredCharacterIds:Set<string>, characterDiscoveredRoomIds:Map<string, string[]>) {
  gameState.rooms.forEach(room => {
    if (discoveredRoomIds.has(room.id)) room.isDiscovered = true;
    room.items.forEach(item => {
      if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
    });
  });
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  }));
  gameState.characters.forEach(character => {
    if (discoveredCharacterIds.has(character.id)) character.isDiscovered = true;
    character.discoveredRoomIds = [...(characterDiscoveredRoomIds.get(character.id) || [])];
  });
}

function _collectAppliedInventoryEvents(gameState:GameState, time:number):AppliedInventoryEvent[] {
  const appliedEvents:AppliedInventoryEvent[] = [];
  gameState.characters.forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      switch(event.type) {
        case ItineraryEventType.TAKE_ITEM:
        case ItineraryEventType.DROP_ITEM:
        case ItineraryEventType.GIVE_ITEM:
          {
            const startPosition = character.itineraryIndex.eventStartPositions[eventIndex];
            assertNonNullable(startPosition);
            appliedEvents.push({
              characterId:character.id,
              eventIndex,
              startPosition:duplicatePosition(startPosition),
              event:event as TakeItemEvent|DropItemEvent|GiveItemEvent
            });
          }
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime || a.characterId.localeCompare(b.characterId) || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

function _collectAppliedExitStateEvents(gameState:GameState, time:number):AppliedExitStateEvent[] {
  const appliedEvents:AppliedExitStateEvent[] = [];
  gameState.characters.forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      switch(event.type) {
        case ItineraryEventType.LOCK:
        case ItineraryEventType.UNLOCK:
          {
            const startPosition = character.itineraryIndex.eventStartPositions[eventIndex];
            assertNonNullable(startPosition);
            appliedEvents.push({
              characterId:character.id,
              eventIndex,
              startPosition:duplicatePosition(startPosition),
              event:event as LockEvent|UnlockEvent
            });
          }
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime || a.characterId.localeCompare(b.characterId) || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

function _collectAppliedVisibilityEvents(gameState:GameState, time:number):AppliedVisibilityEvent[] {
  const appliedEvents:AppliedVisibilityEvent[] = [];
  gameState.characters.forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      switch(event.type) {
        case ItineraryEventType.SHOW:
        case ItineraryEventType.HIDE:
          appliedEvents.push({
            characterId:character.id,
            eventIndex,
            event:event as VisibilityEvent
          });
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime || a.characterId.localeCompare(b.characterId) || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

function _removeItemById(items:GameState['rooms'][number]['items'], itemId:string) {
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return null;
  const [item] = items.splice(itemIndex, 1);
  return item ?? null;
}

function _findCharacter(gameState:GameState, characterId:string):Character {
  const character = gameState.characters.find(currentCharacter => currentCharacter.id === characterId);
  assertNonNullable(character, `character with id ${characterId} not found`);
  return character;
}

function _applyVisibility(gameState:GameState, targetId:string, isVisible:boolean) {
  const character = gameState.characters.find(candidate => candidate.id === targetId) || null;
  if (character) {
    character.isVisible = isVisible;
    return;
  }

  const item = gameState.itemsById.get(targetId) || null;
  assertNonNullable(item, `visibility event target ${targetId} was not found`);
  item.isVisible = isVisible;
}

function _setMatchingExitStatus(gameState:GameState, roomExitId:string, exitStatus:ExitStatus) {
  let didFindMatch = false;
  gameState.rooms.forEach(room => {
    room.exits.forEach(candidate => {
      if (candidate.id !== roomExitId) return;
      candidate.exitStatus = exitStatus;
      didFindMatch = true;
    });
  });
  assertNonNullable(didFindMatch ? roomExitId : null, `unable to find rebuilt exit ${roomExitId}`);
}

function _findRoomExitById(room:GameState['rooms'][number], roomExitId:string) {
  return room.exits.find(candidate => candidate.id === roomExitId) || null;
}

export function rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime?:number) {
  const discoveredRoomIds = _getDiscoveredRoomIds(gameState);
  const characterDiscoveredRoomIds = _getCharacterDiscoveredRoomIds(gameState);
  const discoveredCharacterIds = _getDiscoveredCharacterIds(gameState);
  const discoveredItemIds = _getDiscoveredItemIds(gameState);
  const pendingRoomEffects:PendingRoomEffect[] = [];
  gameState.itemsById = duplicateItemsById(gameState.initialItemsById);
  gameState.characters = gameState.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, gameState.itemsById));
  gameState.rooms = gameState.initialRooms.map(room => duplicateRoomUsingItemIndex(room, gameState.itemsById));

  _collectAppliedInventoryEvents(gameState, time).forEach(({ characterId, startPosition, event }) => {
    const actor = _findCharacter(gameState, characterId);
    switch(event.type) {
      case ItineraryEventType.TAKE_ITEM:
        {
          const takeEvent = event as TakeItemEvent;
          const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          const itemFromRoom = room ? _removeItemById(room.items, takeEvent.itemId) : null;
          const item = itemFromRoom || removeOwnedItemById(actor, takeEvent.itemId);
          if (!item) break;
          if (itemFromRoom && room && !room.isObscured && previousTime !== undefined && takeEvent.startTime > previousTime && takeEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:room.id,
              create:() => gameState.activeEffects.push(createTakeItemEffect(item, actor, room, Date.now(), startPosition.z))
            });
          }
          addOwnedItem(actor, item, takeEvent.destination);
        }
      break;

      case ItineraryEventType.DROP_ITEM:
        {
          const dropEvent = event as DropItemEvent;
          const actorRoom = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          const dropRoom = findRoomAtPosition(gameState.rooms, dropEvent.position.x, dropEvent.position.y);
          if (!actorRoom || !dropRoom || actorRoom.id !== dropRoom.id) break;
          const item = removeOwnedItemById(actor, dropEvent.itemId);
          if (!item) break;
          item.position = duplicatePosition(dropEvent.position);
          item.drawOffset = duplicatePosition(dropEvent.drawOffset);
          if (!dropRoom.isObscured && previousTime !== undefined && dropEvent.startTime > previousTime && dropEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:dropRoom.id,
              create:() => gameState.activeEffects.push(createDropItemEffect(item, actor, dropRoom, Date.now(), startPosition.z))
            });
          }
          dropRoom.items.push(item);
        }
      break;

      case ItineraryEventType.GIVE_ITEM:
        {
          const giveEvent = event as GiveItemEvent;
          const recipient = gameState.characters.find(character => character.id === giveEvent.recipientCharacterId) || null;
          if (!recipient) break;
          const item = removeOwnedItemById(actor, giveEvent.itemId);
          if (!item) break;
          const actorRoom = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          if (!actorRoom?.isObscured && previousTime !== undefined && giveEvent.startTime > previousTime && giveEvent.startTime <= time && actorRoom) {
            pendingRoomEffects.push({
              roomId:actorRoom.id,
              create:() => gameState.activeEffects.push(createGiveItemEffect(item, actorRoom, actor, recipient, Date.now(), gameState.scalingFactors))
            });
          }
          addOwnedItem(recipient, item, 'inventory');
        }
      break;
    }
  });

  _collectAppliedExitStateEvents(gameState, time).forEach(({ startPosition, event }) => {
    const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
    const roomExit = room ? _findRoomExitById(room, event.roomExitId) : null;
    switch(event.type) {
      case ItineraryEventType.LOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.locked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createLockEffect(room, roomExit, Date.now(), gameState.scalingFactors, gameState.imageSet)) });
        }
      break;

      case ItineraryEventType.UNLOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.unlocked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createUnlockEffect(room, roomExit, Date.now(), gameState.scalingFactors, gameState.imageSet)) });
        }
      break;
    }
  });

  _collectAppliedVisibilityEvents(gameState, time).forEach(({ event }) => {
    switch(event.type) {
      case ItineraryEventType.SHOW:
        _applyVisibility(gameState, event.targetId, true);
      break;

      case ItineraryEventType.HIDE:
        _applyVisibility(gameState, event.targetId, false);
      break;
    }
  });

  gameState.characters.forEach(character => {
    const pose = findCharacterPose(character, time);
    character.position = { ...pose.position };
    character.isAlive = pose.isAlive;
    character.facingDirection = pose.facingDirection;
    character.bodyOrientation = pose.bodyOrientation;
  });
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  if (activeRoom) {
    pendingRoomEffects
      .filter(effect => effect.roomId === activeRoom.id)
      .forEach(effect => effect.create());
  }
  _restoreDiscoveryState(gameState, discoveredRoomIds, discoveredItemIds, discoveredCharacterIds, characterDiscoveredRoomIds);
  gameState.time = time;
}