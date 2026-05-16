/* This module groups time-based dynamic-state rebuilding, recreating mutable room and inventory state from the authored level timeline. */

import { assertNonNullable } from "decent-portal";

import { createDropItemEffect } from "./effects/dropItemUtil";
import { createGiveItemEffect } from "./effects/giveItemUtil";
import { createTakeItemEffect } from "./effects/takeItemUtil";
import { findCharacterPose } from "./itineraryUtil";
import Position, { duplicatePosition } from "./types/Position";
import Item from "./types/Item";
import Character, { duplicateCharacter } from "./types/Character";
import { duplicateRoom } from "./types/Room";
import GameState from "./types/GameState";
import { findRoomAtPosition } from "./roomUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";

type AppliedInventoryEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent
}

type PendingRoomEffect = {
  roomId:string,
  create:() => void
}

function _getDiscoveredRoomIds(gameState:GameState):Set<string> {
  return new Set(gameState.rooms.filter(room => room.isDiscovered).map(room => room.id));
}

function _getDiscoveredItemIds(gameState:GameState):Set<string> {
  const discoveredItemIds = new Set<string>();
  gameState.rooms.forEach(room => room.items.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  gameState.characters.forEach(character => character.items.forEach(item => {
    if (item.isDiscovered) discoveredItemIds.add(item.id);
  }));
  return discoveredItemIds;
}

function _restoreDiscoveryState(gameState:GameState, discoveredRoomIds:Set<string>, discoveredItemIds:Set<string>) {
  gameState.rooms.forEach(room => {
    if (discoveredRoomIds.has(room.id)) room.isDiscovered = true;
    room.items.forEach(item => {
      if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
    });
  });
  gameState.characters.forEach(character => character.items.forEach(item => {
    if (discoveredItemIds.has(item.id)) item.isDiscovered = true;
  }));
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

function _removeItemById(items:Item[], itemId:string):Item|null {
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

export function rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime?:number) {
  const discoveredRoomIds = _getDiscoveredRoomIds(gameState);
  const discoveredItemIds = _getDiscoveredItemIds(gameState);
  const pendingRoomEffects:PendingRoomEffect[] = [];
  gameState.characters = gameState.initialCharacters.map(duplicateCharacter);
  gameState.rooms = gameState.initialRooms.map(duplicateRoom);

  _collectAppliedInventoryEvents(gameState, time).forEach(({ characterId, startPosition, event }) => {
    const actor = _findCharacter(gameState, characterId);
    switch(event.type) {
      case ItineraryEventType.TAKE_ITEM:
        {
          const takeEvent = event as TakeItemEvent;
          const room = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          if (!room) break;
          const item = _removeItemById(room.items, takeEvent.itemId);
          if (!item) break;
          if (!room.isObscured && previousTime !== undefined && takeEvent.startTime > previousTime && takeEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:room.id,
              create:() => gameState.activeEffects.push(createTakeItemEffect(item, room, Date.now(), gameState.scalingFactors))
            });
          }
          actor.items.push(item);
        }
      break;

      case ItineraryEventType.DROP_ITEM:
        {
          const dropEvent = event as DropItemEvent;
          const actorRoom = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          const dropRoom = findRoomAtPosition(gameState.rooms, dropEvent.position.x, dropEvent.position.y);
          if (!actorRoom || !dropRoom || actorRoom.id !== dropRoom.id) break;
          const item = _removeItemById(actor.items, dropEvent.itemId);
          if (!item) break;
          const droppedItem = { ...item, position:duplicatePosition(dropEvent.position) };
          if (!dropRoom.isObscured && previousTime !== undefined && dropEvent.startTime > previousTime && dropEvent.startTime <= time) {
            pendingRoomEffects.push({
              roomId:dropRoom.id,
              create:() => gameState.activeEffects.push(createDropItemEffect(droppedItem, dropRoom, Date.now(), gameState.scalingFactors))
            });
          }
          dropRoom.items.push(droppedItem);
        }
      break;

      case ItineraryEventType.GIVE_ITEM:
        {
          const giveEvent = event as GiveItemEvent;
          const recipient = gameState.characters.find(character => character.id === giveEvent.recipientCharacterId) || null;
          if (!recipient) break;
          const item = _removeItemById(actor.items, giveEvent.itemId);
          if (!item) break;
          const actorRoom = findRoomAtPosition(gameState.rooms, startPosition.x, startPosition.y);
          if (!actorRoom?.isObscured && previousTime !== undefined && giveEvent.startTime > previousTime && giveEvent.startTime <= time && actorRoom) {
            pendingRoomEffects.push({
              roomId:actorRoom.id,
              create:() => gameState.activeEffects.push(createGiveItemEffect(item, actorRoom, actor, recipient, Date.now(), gameState.scalingFactors))
            });
          }
          recipient.items.push(item);
        }
      break;
    }
  });

  gameState.characters.forEach(character => {
    const pose = findCharacterPose(character, time);
    character.x = pose.position.x;
    character.y = pose.position.y;
  });
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (activeRoom) {
    pendingRoomEffects
      .filter(effect => effect.roomId === activeRoom.id)
      .forEach(effect => effect.create());
  }
  _restoreDiscoveryState(gameState, discoveredRoomIds, discoveredItemIds);
  gameState.time = time;
}