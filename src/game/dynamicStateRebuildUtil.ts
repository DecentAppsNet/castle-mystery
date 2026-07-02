/* This module groups time-based dynamic-state rebuilding, recreating mutable room and inventory state from the authored level timeline.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { createDropItemEffect } from "./effects/dropItemUtil";
import { createGiveItemEffect } from "./effects/giveItemUtil";
import { createLockEffect, createUnlockEffect } from "./effects/lockEffectUtil";
import { createTakeItemEffect } from "./effects/takeItemUtil";
import { findCharacterPose } from "./itineraryUtil";
import { addOwnedItem, getOwnedItems, removeOwnedItemById } from "./itemOwnershipUtil";
import ItemHoldLocation from "./types/ItemHoldLocation";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import GameState from "./types/GameState";
import { createUnplacedItemsById, duplicateCharacterUsingItemIndex, duplicateCharactersByIdUsingItemIndex, duplicateItemsById, duplicateRoomUsingItemIndex } from "./itemUtil";
import { findRoomAtPosition } from "./roomUtil";
import BecomesCharacterEvent from "./types/itineraryEvents/BecomesCharacterEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import BecomesItemEvent from "./types/itineraryEvents/BecomesItemEvent";
import LockEvent from "./types/itineraryEvents/LockEvent";
import UnlockEvent from "./types/itineraryEvents/UnlockEvent";
import VisibilityEvent from "./types/itineraryEvents/VisibilityEvent";
import ExitStatus from "./types/ExitStatus";
import { findActiveCharacter } from "./activeCharacterUtil";

type AppliedInventoryEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent
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
  const discoveredRoomIdsByCharacterId = new Map<string, string[]>();
  gameState.characters.forEach(character => discoveredRoomIdsByCharacterId.set(character.id, [...character.discoveredRoomIds]));
  gameState.unplacedCharactersById.forEach(character => discoveredRoomIdsByCharacterId.set(character.id, [...character.discoveredRoomIds]));
  return discoveredRoomIdsByCharacterId;
}

function _getDiscoveredCharacterIds(gameState:GameState):Set<string> {
  return new Set([
    ...gameState.discoveredCharacterIds,
    ...gameState.characters.filter(character => character.isDiscovered).map(character => character.id),
    ...Array.from(gameState.unplacedCharactersById.values()).filter(character => character.isDiscovered).map(character => character.id)
  ]);
}

function _getDiscoveredItemIds(gameState:GameState):Set<string> {
  const discoveredItemIds = new Set<string>();
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.characters.forEach(character => getOwnedItems(character).forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.unplacedItemsById.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  });
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
  gameState.unplacedItemsById.forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  });
  [...gameState.characters, ...gameState.unplacedCharactersById.values()].forEach(character => {
    if (discoveredCharacterIds.has(character.id)) character.isDiscovered = true;
    character.discoveredRoomIds = [...(characterDiscoveredRoomIds.get(character.id) || [])];
  });
}

function _findReplayCharacters(gameState:GameState):Character[] {
  return [...gameState.characters, ...gameState.unplacedCharactersById.values()];
}

function _findCharacterReplacementStartTime(character:Character):number|null {
  const replacementEvent = character.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER
    && (event as BecomesCharacterEvent).targetCharacterId === character.id) as BecomesCharacterEvent | undefined;
  return replacementEvent?.startTime ?? null;
}

function _findCharacterReplacementEvent(character:Character):BecomesCharacterEvent|null {
  return character.itinerary.find(event => event.type === ItineraryEventType.BECOMES_CHARACTER
    && (event as BecomesCharacterEvent).targetCharacterId === character.id) as BecomesCharacterEvent | undefined || null;
}

function _isReplayEventActiveForCharacter(gameState:GameState, character:Character, eventStartTime:number):boolean {
  if (!gameState.initialUnplacedCharactersById.has(character.id)) return true;
  const replacementStartTime = _findCharacterReplacementStartTime(character);
  if (replacementStartTime === null) return true;
  return eventStartTime >= replacementStartTime;
}

function _shouldCollectInventoryEvent(gameState:GameState, character:Character,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent):boolean {
  if (!_isReplayEventActiveForCharacter(gameState, character, event.startTime)) return false;
  if (event.type !== ItineraryEventType.BECOMES_CHARACTER) return true;
  return (event as BecomesCharacterEvent).sourceCharacterId === character.id;
}

function _collectAppliedInventoryEvents(gameState:GameState, time:number):AppliedInventoryEvent[] {
  const appliedEvents:AppliedInventoryEvent[] = [];
  _findReplayCharacters(gameState).forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      switch(event.type) {
        case ItineraryEventType.TAKE_ITEM:
        case ItineraryEventType.DROP_ITEM:
        case ItineraryEventType.GIVE_ITEM:
        case ItineraryEventType.BECOMES_ITEM:
        case ItineraryEventType.BECOMES_CHARACTER:
          {
            const inventoryEvent = event as TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent;
            if (!_shouldCollectInventoryEvent(gameState, character, inventoryEvent)) break;
            const startPosition = character.itineraryIndex.eventStartPositions[eventIndex];
            assertNonNullable(startPosition);
            appliedEvents.push({
              characterId:character.id,
              eventIndex,
              startPosition:duplicatePosition(startPosition),
              event:inventoryEvent
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
  _findReplayCharacters(gameState).forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      if (!_isReplayEventActiveForCharacter(gameState, character, event.startTime)) return;
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
  _findReplayCharacters(gameState).forEach(character => {
    character.itinerary.forEach((event, eventIndex) => {
      if (event.startTime > time) return;
      if (!_isReplayEventActiveForCharacter(gameState, character, event.startTime)) return;
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

function _copyReplacementStateOntoTarget(sourceItem:GameState['rooms'][number]['items'][number], targetItem:GameState['rooms'][number]['items'][number]) {
  targetItem.position = duplicatePosition(sourceItem.position);
  targetItem.drawOffset = duplicatePosition(sourceItem.drawOffset);
  return targetItem;
}

function _storeUnplacedReplacementSource(gameState:GameState, sourceItem:GameState['rooms'][number]['items'][number]) {
  gameState.unplacedItemsById.set(sourceItem.id, sourceItem);
}

function _replaceRoomItem(gameState:GameState, sourceItemId:string, targetItemId:string):boolean {
  for (const room of gameState.rooms) {
    const sourceItem = _removeItemById(room.items, sourceItemId);
    if (!sourceItem) continue;
    const targetItem = gameState.unplacedItemsById.get(targetItemId) || null;
    assertNonNullable(targetItem, `unplaced replacement target ${targetItemId} was not found`);
    gameState.unplacedItemsById.delete(targetItemId);
    _storeUnplacedReplacementSource(gameState, sourceItem);
    room.items.push(_copyReplacementStateOntoTarget(sourceItem, targetItem));
    return true;
  }
  return false;
}

function _findOwnedItemLocation(character:Character, itemId:string):ItemHoldLocation {
  if (character.leftHandItem?.id === itemId) return 'left-hand';
  if (character.rightHandItem?.id === itemId) return 'right-hand';
  return 'inventory';
}

function _replaceOwnedItem(gameState:GameState, sourceItemId:string, targetItemId:string):boolean {
  for (const character of gameState.characters) {
    const location = _findOwnedItemLocation(character, sourceItemId);
    const sourceItem = removeOwnedItemById(character, sourceItemId);
    if (!sourceItem) continue;
    const targetItem = gameState.unplacedItemsById.get(targetItemId) || null;
    assertNonNullable(targetItem, `unplaced replacement target ${targetItemId} was not found`);
    gameState.unplacedItemsById.delete(targetItemId);
    _storeUnplacedReplacementSource(gameState, sourceItem);
    const replacementItem = _copyReplacementStateOntoTarget(sourceItem, targetItem);
    addOwnedItem(character, replacementItem, location);
    return true;
  }
  return false;
}

function _applyItemReplacement(gameState:GameState, sourceItemId:string, targetItemId:string) {
  if (_replaceRoomItem(gameState, sourceItemId, targetItemId)) return;
  if (_replaceOwnedItem(gameState, sourceItemId, targetItemId)) return;
  throw new Error(`replacement source ${sourceItemId} was not found in runtime state`);
}

function _isCharacterReplacementSeamless(gameState:GameState,
  sourceCharacter:Character,
  targetCharacterId:string,
  replacementPosition:Position):boolean {
  if (gameState.activeCharacterId !== sourceCharacter.id && gameState.activeCharacterId !== targetCharacterId) return false;
  if (!sourceCharacter.isVisible) return false;
  const sourceRoom = findRoomAtPosition(gameState.rooms, replacementPosition.x, replacementPosition.y);
  return !!sourceRoom && !sourceRoom.isObscured;
}

function _applyCharacterReplacement(gameState:GameState, sourceCharacterId:string, targetCharacterId:string, replacementPosition:Position) {
  assert(targetCharacterId !== sourceCharacterId);
  const sourceCharacterIndex = gameState.characters.findIndex(character => character.id === sourceCharacterId);
  if (sourceCharacterIndex === -1) throw new Error(`replacement source character ${sourceCharacterId} was not found in runtime state`);
  const sourceCharacter = gameState.characters[sourceCharacterIndex];
  const targetCharacter = gameState.unplacedCharactersById.get(targetCharacterId) || null;
  assertNonNullable(targetCharacter, `unplaced replacement target character ${targetCharacterId} was not found`);
  gameState.unplacedCharactersById.delete(targetCharacterId);

  sourceCharacter.position = duplicatePosition(replacementPosition);
  targetCharacter.position = duplicatePosition(replacementPosition);
  targetCharacter.waypoint = sourceCharacter.waypoint;
  targetCharacter.facingDirection = sourceCharacter.facingDirection;
  targetCharacter.bodyOrientation = sourceCharacter.bodyOrientation;
  targetCharacter.isVisible = sourceCharacter.isVisible;
  targetCharacter.items = sourceCharacter.items;
  targetCharacter.leftHandItem = sourceCharacter.leftHandItem;
  targetCharacter.rightHandItem = sourceCharacter.rightHandItem;

  sourceCharacter.items = [];
  sourceCharacter.leftHandItem = null;
  sourceCharacter.rightHandItem = null;
  gameState.unplacedCharactersById.set(sourceCharacter.id, sourceCharacter);
  gameState.characters.splice(sourceCharacterIndex, 1, targetCharacter);
  if (_isCharacterReplacementSeamless(gameState, sourceCharacter, targetCharacterId, replacementPosition)) {
    gameState.activeCharacterId = targetCharacterId;
    assert(gameState.activeCharacterId !== sourceCharacterId);
    return;
  }
  if (gameState.activeCharacterId === targetCharacterId) {
    gameState.activeCharacterId = sourceCharacterId;
  }
  assert(gameState.activeCharacterId === sourceCharacterId || gameState.activeCharacterId !== targetCharacterId);
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

function _normalizeActiveCharacterForTime(gameState:GameState, time:number) {
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  const replacementEvent = _findCharacterReplacementEvent(activeCharacter);
  if (replacementEvent && time < replacementEvent.startTime) {
    gameState.activeCharacterId = replacementEvent.sourceCharacterId;
  }
}

export function rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime:number|undefined, metaTime:number) {
  const discoveredRoomIds = _getDiscoveredRoomIds(gameState);
  const characterDiscoveredRoomIds = _getCharacterDiscoveredRoomIds(gameState);
  const discoveredCharacterIds = _getDiscoveredCharacterIds(gameState);
  const discoveredItemIds = _getDiscoveredItemIds(gameState);
  const pendingRoomEffects:PendingRoomEffect[] = [];
  gameState.itemsById = duplicateItemsById(gameState.initialItemsById);
  gameState.characters = gameState.initialCharacters.map(character => duplicateCharacterUsingItemIndex(character, gameState.itemsById));
  gameState.rooms = gameState.initialRooms.map(room => duplicateRoomUsingItemIndex(room, gameState.itemsById));
  gameState.unplacedCharactersById = duplicateCharactersByIdUsingItemIndex(gameState.initialUnplacedCharactersById, gameState.itemsById);
  gameState.unplacedItemsById = createUnplacedItemsById(gameState.itemsById, gameState.rooms, gameState.characters);

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

  _collectAppliedInventoryEvents(gameState, time).forEach(({ characterId, startPosition, event }) => {
    const actor = _findCharacter(gameState, characterId);
    switch(event.type) {
      case ItineraryEventType.TAKE_ITEM:
        {
          const takeEvent = event as TakeItemEvent;
          const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          const itemFromRoom = room ? _removeItemById(room.items, takeEvent.itemId) : null;
          const item = itemFromRoom || removeOwnedItemById(actor, takeEvent.itemId);
          assertNonNullable(item, `unable to replay take item ${takeEvent.itemId} for ${actor.id}`);
          if (itemFromRoom && room && !room.isObscured && previousTime !== undefined && takeEvent.startTime > previousTime && takeEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:room.id,
              create:() => gameState.activeEffects.push(createTakeItemEffect(item, actor, room, metaTime, startPosition.z))
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
          assertNonNullable(actorRoom, `unable to find actor room when replaying drop item ${dropEvent.itemId} for ${actor.id}`);
          assertNonNullable(dropRoom, `unable to find drop room when replaying drop item ${dropEvent.itemId} for ${actor.id}`);
          assert(actorRoom.id === dropRoom.id, `drop item ${dropEvent.itemId} for ${actor.id} changed rooms during replay`);
          const item = removeOwnedItemById(actor, dropEvent.itemId);
          assertNonNullable(item, `unable to replay drop item ${dropEvent.itemId} for ${actor.id}`);
          item.position = duplicatePosition(dropEvent.position);
          item.drawOffset = duplicatePosition(dropEvent.drawOffset);
          if (!dropRoom.isObscured && previousTime !== undefined && dropEvent.startTime > previousTime && dropEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:dropRoom.id,
              create:() => gameState.activeEffects.push(createDropItemEffect(item, actor, dropRoom, metaTime, startPosition.z))
            });
          }
          dropRoom.items.push(item);
        }
      break;

      case ItineraryEventType.GIVE_ITEM:
        {
          const giveEvent = event as GiveItemEvent;
          const recipient = gameState.characters.find(character => character.id === giveEvent.recipientCharacterId) || null;
          assertNonNullable(recipient, `unable to replay give item recipient ${giveEvent.recipientCharacterId}`);
          const item = removeOwnedItemById(actor, giveEvent.itemId);
          assertNonNullable(item, `unable to replay give item ${giveEvent.itemId} for ${actor.id}`);
          const actorRoom = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          if (!actorRoom?.isObscured && previousTime !== undefined && giveEvent.startTime > previousTime && giveEvent.startTime <= time && actorRoom) {
            pendingRoomEffects.push({
              roomId:actorRoom.id,
              create:() => gameState.activeEffects.push(createGiveItemEffect(item, actorRoom, actor, recipient, metaTime, gameState.scalingFactors))
            });
          }
          addOwnedItem(recipient, item, 'inventory');
        }
      break;

      case ItineraryEventType.BECOMES_ITEM:
        {
          const becomesItemEvent = event as BecomesItemEvent;
          _applyItemReplacement(gameState, becomesItemEvent.sourceItemId, becomesItemEvent.targetItemId);
        }
      break;

      case ItineraryEventType.BECOMES_CHARACTER:
        {
          const becomesCharacterEvent = event as BecomesCharacterEvent;
          _applyCharacterReplacement(gameState,
            becomesCharacterEvent.sourceCharacterId,
            becomesCharacterEvent.targetCharacterId,
            startPosition);
        }
      break;
    }
  });
  gameState.unplacedItemsById = createUnplacedItemsById(gameState.itemsById, gameState.rooms, gameState.characters);

  _collectAppliedExitStateEvents(gameState, time).forEach(({ startPosition, event }) => {
    const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
    const roomExit = room ? _findRoomExitById(room, event.roomExitId) : null;
    switch(event.type) {
      case ItineraryEventType.LOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.locked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createLockEffect(room, roomExit, metaTime, gameState.scalingFactors, gameState.imageSet)) });
        }
      break;

      case ItineraryEventType.UNLOCK:
        _setMatchingExitStatus(gameState, event.roomExitId, ExitStatus.unlocked);
        if (room && roomExit && previousTime !== undefined && event.startTime > previousTime && event.startTime <= time && !room.isObscured) {
          pendingRoomEffects.push({ roomId:room.id, create:() => gameState.activeEffects.push(createUnlockEffect(room, roomExit, metaTime, gameState.scalingFactors, gameState.imageSet)) });
        }
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
  _normalizeActiveCharacterForTime(gameState, time);
  const activeCharacter = findActiveCharacter(gameState);
  assertNonNullable(activeCharacter);
  const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.position.x, activeCharacter.position.y);
  assertNonNullable(activeRoom);
  pendingRoomEffects
    .filter(effect => effect.roomId === activeRoom.id)
    .forEach(effect => effect.create());
  _restoreDiscoveryState(gameState, discoveredRoomIds, discoveredItemIds, discoveredCharacterIds, characterDiscoveredRoomIds);
  gameState.time = time;
}