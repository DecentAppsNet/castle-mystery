/* This module groups inventory and replacement replay helpers used during dynamic-state rebuild, meaning the rebuild process that starts from initial runtime state and re-applies authored timeline events up to a target time.
   If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import { createDropItemEffect } from "../effects/dropItemUtil";
import { createGiveItemEffect } from "../effects/giveItemUtil";
import { createTakeItemEffect } from "../effects/takeItemUtil";
import { createItineraryIndex, findCharacterPoseWithoutPairHistory } from "../itineraryUtil";
import { addOwnedItem, removeOwnedItemById } from "../itemOwnershipUtil";
import { createUnplacedItemsById } from "../itemUtil";
import { findRoomAtPosition } from "../roomUtil";
import Character from "../types/Character";
import GameState from "../types/GameState";
import ItemHoldLocation from "../types/ItemHoldLocation";
import Position, { duplicatePosition } from "../types/Position";
import BecomesCharacterEvent from "../types/itineraryEvents/BecomesCharacterEvent";
import BecomesItemEvent from "../types/itineraryEvents/BecomesItemEvent";
import DropItemEvent from "../types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "../types/itineraryEvents/GiveItemEvent";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import TakeItemEvent from "../types/itineraryEvents/TakeItemEvent";
import { PendingRoomEffect } from "./exitStateApplicationUtil";
import { findCharacterReplacementEvent, findReplayCharacters, isReplayEventActiveForCharacter } from "./replayCharacterUtil";

type AppliedInventoryEvent = {
  characterId:string,
  eventIndex:number,
  startPosition:Position,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent
}

// Filter replayed inventory events to the events that should be active for this character at this time.
function _shouldCollectInventoryEvent(gameState:GameState, character:Character,
  event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent):boolean {
  if (!isReplayEventActiveForCharacter(gameState, character, event.startTime)) return false;
  if (event.type !== ItineraryEventType.BECOMES_CHARACTER) return true;
  return (event as BecomesCharacterEvent).sourceCharacterId === character.id;
}

// Resolve the event start position to use when replaying inventory events across replacement boundaries.
function _findReplayInventoryEventStartPosition(gameState:GameState, character:Character,
  eventIndex:number, event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent):Position {
  const incomingReplacementEvent = !gameState.initialUnplacedCharactersById.has(character.id)
    ? findCharacterReplacementEvent(character)
    : null;
  if (incomingReplacementEvent && event.startTime >= incomingReplacementEvent.startTime && character.pairedItinerary) {
    const pairedEventIndex = character.pairedItinerary.indexOf(event);
    const pairedStartPosition = createItineraryIndex(character.pairedItinerary, character.position, character.id).eventStartPositions[pairedEventIndex];
    assertNonNullable(pairedStartPosition);
    return duplicatePosition(pairedStartPosition);
  }
  const startPosition = character.itineraryIndex.eventStartPositions[eventIndex];
  assertNonNullable(startPosition);
  return duplicatePosition(startPosition);
}

// Replay character replacements before other same-timestamp inventory events.
function _getInventoryEventReplayOrder(event:TakeItemEvent|DropItemEvent|GiveItemEvent|BecomesItemEvent|BecomesCharacterEvent):number {
  return event.type === ItineraryEventType.BECOMES_CHARACTER ? 0 : 1;
}

// Gather and sort inventory-affecting events that should already have happened by the target time.
function _collectAppliedInventoryEvents(gameState:GameState, time:number):AppliedInventoryEvent[] {
  const appliedEvents:AppliedInventoryEvent[] = [];
  findReplayCharacters(gameState).forEach(character => {
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
            appliedEvents.push({
              characterId:character.id,
              eventIndex,
              startPosition:_findReplayInventoryEventStartPosition(gameState, character, eventIndex, inventoryEvent),
              event:inventoryEvent
            });
          }
        break;
      }
    });
  });
  appliedEvents.sort((a, b) => a.event.startTime - b.event.startTime
    || _getInventoryEventReplayOrder(a.event) - _getInventoryEventReplayOrder(b.event)
    || a.characterId.localeCompare(b.characterId)
    || a.eventIndex - b.eventIndex);
  return appliedEvents;
}

// Remove a room item by id and return the removed instance when present.
function _removeItemById(items:GameState['rooms'][number]['items'], itemId:string) {
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return null;
  const [item] = items.splice(itemIndex, 1);
  return item ?? null;
}

// Copy the visible runtime placement state from a replacement source item onto its target item.
function _copyReplacementStateOntoTarget(sourceItem:GameState['rooms'][number]['items'][number], targetItem:GameState['rooms'][number]['items'][number]) {
  targetItem.position = duplicatePosition(sourceItem.position);
  targetItem.drawOffset = duplicatePosition(sourceItem.drawOffset);
  return targetItem;
}

// Preserve the removed replacement source item in unplaced storage after the swap.
function _storeUnplacedReplacementSource(gameState:GameState, sourceItem:GameState['rooms'][number]['items'][number]) {
  gameState.unplacedItemsById.set(sourceItem.id, sourceItem);
}

// Replace a room-placed item with its unplaced target when the source is lying in a room.
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

// Report where an owned item currently sits on a character so replacement preserves that slot.
function _findOwnedItemLocation(character:Character, itemId:string):ItemHoldLocation {
  if (character.leftHandItem?.id === itemId) return 'left-hand';
  if (character.rightHandItem?.id === itemId) return 'right-hand';
  return 'inventory';
}

// Replace an inventory or hand-held item with its unplaced target.
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

// Apply an item replacement no matter whether the source is room-placed or character-owned.
function _applyItemReplacement(gameState:GameState, sourceItemId:string, targetItemId:string) {
  if (_replaceRoomItem(gameState, sourceItemId, targetItemId)) return;
  if (_replaceOwnedItem(gameState, sourceItemId, targetItemId)) return;
  throw new Error(`replacement source ${sourceItemId} was not found in runtime state`);
}

// Swap the placed source character for its unplaced target while preserving the current visible runtime state.
function _applyCharacterReplacement(gameState:GameState, sourceCharacterId:string, targetCharacterId:string, replacementPosition:Position,
  replacementTime:number) {
  assert(targetCharacterId !== sourceCharacterId);
  const sourceCharacterIndex = gameState.characters.findIndex(character => character.id === sourceCharacterId);
  if (sourceCharacterIndex === -1) throw new Error(`replacement source character ${sourceCharacterId} was not found in runtime state`);
  const sourceCharacter = gameState.characters[sourceCharacterIndex];
  const targetCharacter = gameState.unplacedCharactersById.get(targetCharacterId) || null;
  assertNonNullable(targetCharacter, `unplaced replacement target character ${targetCharacterId} was not found`);
  gameState.unplacedCharactersById.delete(targetCharacterId);
  const sourcePose = findCharacterPoseWithoutPairHistory(sourceCharacter, replacementTime);

  sourceCharacter.position = duplicatePosition(replacementPosition);
  targetCharacter.position = duplicatePosition(replacementPosition);
  targetCharacter.waypoint = sourceCharacter.waypoint;
  targetCharacter.facingDirection = sourcePose.facingDirection;
  targetCharacter.bodyOrientation = sourcePose.bodyOrientation;
  targetCharacter.isVisible = sourceCharacter.isVisible;
  targetCharacter.items = sourceCharacter.items;
  targetCharacter.leftHandItem = sourceCharacter.leftHandItem;
  targetCharacter.rightHandItem = sourceCharacter.rightHandItem;

  sourceCharacter.items = [];
  sourceCharacter.leftHandItem = null;
  sourceCharacter.rightHandItem = null;
  gameState.unplacedCharactersById.set(sourceCharacter.id, sourceCharacter);
  gameState.characters.splice(sourceCharacterIndex, 1, targetCharacter);
  if (sourceCharacter.isPairingKnown) {
    gameState.activeCharacterId = targetCharacterId;
    assert(gameState.activeCharacterId !== sourceCharacterId);
    return;
  }
  if (gameState.activeCharacterId === targetCharacterId) gameState.activeCharacterId = sourceCharacterId;
  assert(gameState.activeCharacterId === sourceCharacterId || gameState.activeCharacterId !== targetCharacterId);
}

// Find a currently placed character and fail loudly if replay logic expected it to exist.
function _findCharacter(gameState:GameState, characterId:string):Character {
  const character = gameState.characters.find(currentCharacter => currentCharacter.id === characterId);
  assertNonNullable(character, `character with id ${characterId} not found`);
  return character;
}

// Replay inventory-affecting events and replacement events into runtime state and enqueue any visible room effects.
export function applyInventoryState(gameState:GameState, time:number, previousTime:number|undefined, metaTime:number,
  pendingRoomEffects:PendingRoomEffect[]) {
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
            startPosition,
            becomesCharacterEvent.startTime);
        }
      break;
    }
  });
  gameState.unplacedItemsById = createUnplacedItemsById(gameState.itemsById, gameState.rooms, gameState.characters);
}