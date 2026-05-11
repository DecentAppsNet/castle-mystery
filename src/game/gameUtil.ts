import { assertNonNullable, botch } from "decent-portal";
import Character, { duplicateCharacter } from "./types/Character";
import GameState from "./types/GameState";
import { duplicateRoom } from "./types/Room";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import { findCharacterPose } from "./itineraryUtil";
import { calcRoomsBoundingRect, findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import { msecsToMinutes } from "@/homeScreen/interactions/gameplay";
import ScalingFactors from "./types/ScalingFactors";
import { calcScalingFactors, ZERO_SCALING_FACTORS } from "./drawUtil";
import Rect from "./types/Rect";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import MouseMoveEvent from "./types/playerEvents/MouseMoveEvent";
import { drawCharacterPopover, findVisibleCharactersInRoom } from "./characterDrawUtil";
import { drawRoom } from "./roomDrawUtil";
import { COLOR_BLACK } from "./drawConstants";
import { discoverVisibleItemsInRoom, drawItemPopover, findDiscoveredItemAtPosition } from "./itemDrawUtil";
import { processLevelEffects } from "./effects/effectUtil";
import { createItemDiscoveryEffect } from "./effects/itemDiscoveryUtil";
import { createPauseEffect, createPlayEffect } from "./effects/playPauseEffectUtil";
import { createDropItemEffect } from "./effects/dropItemUtil";
import { createGiveItemEffect } from "./effects/giveItemUtil";
import { createTakeItemEffect } from "./effects/takeItemUtil";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import Position, { duplicatePosition } from "./types/Position";
import Item from "./types/Item";

const UPDATE_MINUTES_REAL_TIME_INTERVAL = 200;

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

export function findCharacter(gameState:GameState, characterId:string):Character {
  const character = gameState.characters.find((c) => c.id === characterId);
  assertNonNullable(character, `character with id ${characterId} not found`);
  return character;
}

function _setActiveRoomDiscovered(gameState:GameState) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI];
  if (activeCharacter) {
    const activeRoom = findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y);
    if (activeRoom) activeRoom.isDiscovered = true;
  }
}

function _discoverVisibleItemsInActiveRoom(gameState:GameState) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeCharacter || !activeRoom) return;
  if (activeRoom.isObscured) return;
  discoverVisibleItemsInRoom(activeRoom, activeCharacter, gameState.scalingFactors)
    .forEach(item => gameState.activeEffects.push(createItemDiscoveryEffect(item, activeRoom, Date.now(), gameState.scalingFactors)));
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

function _rebuildDynamicStateForTime(gameState:GameState, time:number, previousTime?:number) {
  const discoveredRoomIds = _getDiscoveredRoomIds(gameState);
  const discoveredItemIds = _getDiscoveredItemIds(gameState);
  const pendingRoomEffects:PendingRoomEffect[] = [];
  gameState.characters = gameState.initialCharacters.map(duplicateCharacter);
  gameState.rooms = gameState.initialRooms.map(duplicateRoom);

  _collectAppliedInventoryEvents(gameState, time).forEach(({ characterId, startPosition, event }) => {
    const actor = findCharacter(gameState, characterId);
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
    character.facingAngle = pose.facingAngle;
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

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent) {
  const wasPlaying = gameState.isPlaying;
  gameState.activeEffects.length = 0;
  _rebuildDynamicStateForTime(gameState, event.time);
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

function _getCharacterBoundingRect(character:Character, scalingFactors:ScalingFactors):Rect {
  const roomLineWidth = scalingFactors.roomLineWidth;
  const characterWidthPixels = roomLineWidth * 5;
  const characterHeightPixels = roomLineWidth * 10;
  // character.x/character.y represent the bottom-center point in game position space
  const halfWidthGame = (characterWidthPixels / 2) / scalingFactors.scaleX;
  const heightGame = characterHeightPixels / scalingFactors.scaleY;
  const left = character.x - halfWidthGame;
  const top = character.y - heightGame; // top is bottom minus full height
  return { x: left, y: top, width: halfWidthGame * 2, height: heightGame };
}

function _findCharacterAtPosition(gameState:GameState, x:number, y:number):Character|null {
  if (gameState.characters.length === 0) return null;
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (activeRoom?.isObscured) return null;
  const candidateCharacters = activeCharacter && activeRoom
    ? findVisibleCharactersInRoom(activeRoom, findCharactersInRoom(activeRoom, gameState.characters), activeCharacter, gameState.scalingFactors)
    : gameState.characters;
  if (candidateCharacters.length === 0) return null;

  // Find nearest character by Euclidean distance in game position
  let nearest:Character = candidateCharacters[0];
  let nearestDist = Math.hypot(nearest.x - x, nearest.y - y);
  for (let i = 1; i < candidateCharacters.length; ++i) {
    const c = candidateCharacters[i];
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < nearestDist) {
      nearest = c;
      nearestDist = d;
    }
  }

  // Check whether the point is inside that character's bounding rect
  const rect = _getCharacterBoundingRect(nearest, gameState.scalingFactors);
  if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) return nearest;
  return null;
}

function _updateGameStateForMouseDown(gameState:GameState, event:MouseDownEvent) {
  const character = _findCharacterAtPosition(gameState, event.x, event.y);
  if (character) {
    const characterI = gameState.characters.indexOf(character);
    gameState.activeCharacterI = characterI;
  }
}

function _updateGameStateForMouseMove(gameState:GameState, event:MouseMoveEvent) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  if (!activeCharacter || !activeRoom) {
    gameState.hoveredItemId = null;
    gameState.hoveredCharacterId = null;
    return;
  }
  _discoverVisibleItemsInActiveRoom(gameState);
  const hoveredItem = findDiscoveredItemAtPosition(activeRoom, event.x, event.y, gameState.scalingFactors);
  gameState.hoveredItemId = hoveredItem?.id ?? null;
  gameState.hoveredCharacterId = hoveredItem ? null : _findCharacterAtPosition(gameState, event.x, event.y)?.id ?? null;
}

function _updateGameState(gameState:GameState, events:PlayerEvent[]) {
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: _updateGameStateForChangeTime(gameState, event as ChangeTimeEvent); break;
      case PlayerEventType.PLAY_PAUSE: _updateGameStateForPlayPause(gameState, event as PlayPauseEvent); break;
      case PlayerEventType.MOUSEDOWN: _updateGameStateForMouseDown(gameState, event as MouseDownEvent); break;
      case PlayerEventType.MOUSEMOVE: _updateGameStateForMouseMove(gameState, event as MouseMoveEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    const previousTime = gameState.time;
    const nextTime = Math.min(gameState.duration, Date.now() + gameState.realTimeToGameTimeOffset);
    _rebuildDynamicStateForTime(gameState, nextTime, previousTime);
    if (nextTime >= gameState.duration) _pauseGameState(gameState);
  }
  _setActiveRoomDiscovered(gameState);
  _discoverVisibleItemsInActiveRoom(gameState);
}

function _findCharacterI(characters:Character[], characterId:string):number {
  for(let i = 0; i < characters.length; ++i) {
    if (characters[i].id === characterId) return i;
  }
  return -1;
}

function _updateScalingFactorsAsNeeded(gameState:GameState, context:CanvasRenderingContext2D):ScalingFactors {
  const destW = context.canvas.width;
  const destH = context.canvas.height;
  let scalingFactors = gameState.scalingFactors;
  assertNonNullable(scalingFactors);
  if (scalingFactors.destWidth !== destW || scalingFactors.destHeight !== destH) {
    const roomsBoundingRect = calcRoomsBoundingRect(gameState.rooms);
    scalingFactors = calcScalingFactors(roomsBoundingRect.width, roomsBoundingRect.height, destW, destH);
    gameState.scalingFactors = scalingFactors;
    gameState.activeEffects.length = 0;
  }
  return scalingFactors;
}

function _drawGameState(gameState:GameState, context:CanvasRenderingContext2D) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  for(let roomI = 0; roomI < gameState.rooms.length; ++roomI) {
    const room = gameState.rooms[roomI];
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = activeCharacter ? charactersInRoom.some(character => character.id === activeCharacter.id) : false;
    drawRoom(room, charactersInRoom, isActive, activeCharacter, gameState.activeEffects, gameState.scalingFactors, context, gameState.time, gameState.isPlaying);
  }
  if (activeRoom && gameState.hoveredItemId) {
    const hoveredItem = activeRoom.items.find(item => item.id === gameState.hoveredItemId && item.isDiscovered) || null;
    if (hoveredItem) drawItemPopover(hoveredItem, gameState.scalingFactors, context);
    processLevelEffects(gameState.activeEffects, context);
    return;
  }
  if (gameState.hoveredCharacterId) {
    const hoveredCharacter = gameState.characters.find(character => character.id === gameState.hoveredCharacterId) || null;
    if (hoveredCharacter) drawCharacterPopover(hoveredCharacter, gameState.scalingFactors, context);
  }
  processLevelEffects(gameState.activeEffects, context);
}

function _callOnMinutesChangedAsNeeded(gameState:GameState, onMinutesChanged:(minutes:number) => void) {
  const nextMinutes = msecsToMinutes(gameState.time);
  const now = Date.now();
  const isSameMinutesValue = nextMinutes === gameState.lastMinutesChangedValue;
  const isThrottleIntervalElapsed = now - gameState.lastMinutesChangedCallRealTime >= UPDATE_MINUTES_REAL_TIME_INTERVAL;
  if (isSameMinutesValue || !isThrottleIntervalElapsed) return;
  gameState.lastMinutesChangedCallRealTime = now;
  gameState.lastMinutesChangedValue = nextMinutes;
  onMinutesChanged(nextMinutes);
}

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D,
  onMinutesChanged:(minutes:number) => void, onIsPlayingChanged?:(isPlaying:boolean) => void) {
  context.fillStyle = COLOR_BLACK;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  if (!gameState) return;

  const wasPlaying = gameState.isPlaying;
  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events);
  if (onIsPlayingChanged && wasPlaying !== gameState.isPlaying) onIsPlayingChanged(gameState.isPlaying);
  _callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);

  _updateScalingFactorsAsNeeded(gameState, context);
  _drawGameState(gameState, context);
}

export function createGameStateFromLevel(level:Level):GameState {
  const gameState:GameState = {
    characters:level.characters.map(duplicateCharacter),
    rooms:level.rooms.map(duplicateRoom),
    initialCharacters:level.characters.map(duplicateCharacter),
    initialRooms:level.rooms.map(duplicateRoom),
    activeEffects:[],
    hoveredItemId:null,
    hoveredCharacterId:null,
    activeCharacterI:_findCharacterI(level.characters, level.activeCharacterId),
    isPlaying:false,
    time:level.startTime,
    duration:level.duration,
    realTimeToGameTimeOffset:0,
    labels:level.labels.map(label => ({...label})),
    scalingFactors:ZERO_SCALING_FACTORS,
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN
  }
  if (level.startTime > 0) _rebuildDynamicStateForTime(gameState, level.startTime);
  _setActiveRoomDiscovered(gameState);
  return gameState;
}