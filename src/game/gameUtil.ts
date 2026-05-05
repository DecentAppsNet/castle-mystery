import { assertNonNullable, botch } from "decent-portal";
import Character, { duplicateCharacter } from "./types/Character";
import GameState from "./types/GameState";
import Room, { duplicateRoom } from "./types/Room";
import RoomExit from "./types/RoomExit";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import { findCharacterPosition, findCharacterScrubPosition, generateScrubPositions } from "./itineraryUtil";
import { calcRoomsBoundingRect, findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import { msecsToMinutes } from "@/homeScreen/interactions/gameplay";
import ScalingFactors from "./types/ScalingFactors";
import { gameToCanvasPosition, calcScalingFactors, ZERO_SCALING_FACTORS } from "./drawUtil";
import Rect from "./types/Rect";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";

const PULSE_CADENCE_MS = 1000; // milliseconds for one grow+shrink cycle
const PULSE_SCALE_PEAK = 1.2; // peak scale multiplier for pulse
const CHARACTER_SWAY_INTERVAL = 1500; // ms for full left-right-left cycle
const CHARACTER_SWAY_AMOUNT = 1; // pixels to sway left/right from center    
const UPDATE_MINUTES_REAL_TIME_INTERVAL = 200;

function _drawRoomExit(exit:RoomExit, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  const left = exitX - roomLineWidth;
  const top = exitY - roomLineWidth;
  const width = roomLineWidth * 3;
  const height = roomLineWidth * 3;
  context.fillStyle = "#000";
  context.lineWidth = roomLineWidth;
  context.fillRect(left, top, width, height);
}

// Draw a stick figure inside the rect of the character.
function _drawCharacter(character:Character, isActive:boolean, scalingFactors:ScalingFactors, 
      context:CanvasRenderingContext2D, time:number) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = "#000";

  if (isActive) {
    const baseRadius = Math.hypot(characterWidth / 2, characterHeight / 2) / 2 + roomLineWidth;
    const phase = (time % PULSE_CADENCE_MS) / PULSE_CADENCE_MS; // 0..1
    const t = phase <= 0.5 ? phase * 2 : 2 * (1 - phase); // triangular wave 0..1..0
    const scale = 1 + (PULSE_SCALE_PEAK - 1) * t;
    const radius = baseRadius * scale;
    context.fillStyle = "#ffe60040";
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    context.fill();
  }
  const swayPhase = (time % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL; // 0..1
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT; // easing via sine
  const backboneX = centerX + sway;
  context.beginPath();
  context.arc(backboneX, centerY - characterHeight / 4, headRadius, 0, 2 * Math.PI); // Head
  context.moveTo(backboneX, centerY - characterHeight / 4 + headRadius); // Move to neck
  context.lineTo(backboneX, centerY + characterHeight / 4); // Body
  context.moveTo(backboneX, centerY); // Move to middle of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 8); // Left arm
  context.moveTo(backboneX, centerY); // Move back to middle of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 8); // Right arm
  context.moveTo(backboneX, centerY + characterHeight / 4); // Move to bottom of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 2); // Left leg
  context.moveTo(backboneX, centerY + characterHeight / 4); // Move back to bottom of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 2); // Right leg
  context.stroke();
}

function _drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacterId:string,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number) {
  if (!room.isDiscovered) return;
  const scaledTopLeft = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const scaledWidth = scaledBottomRight[0] - scaledTopLeft[0];
  const scaledHeight = scaledBottomRight[1] - scaledTopLeft[1];
  context.lineWidth = scalingFactors.roomLineWidth;
  context.fillStyle = isActive ? "#fff" : "#aaa";
  context.fillRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.strokeStyle = "#333";
  context.strokeRect(scaledTopLeft[0], scaledTopLeft[1], scaledWidth, scaledHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#999";
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  context.fillText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  context.fillStyle = "#000";
  room.exits.forEach(exit => _drawRoomExit(exit, scalingFactors, context));
  if (isActive) charactersInRoom.forEach(character => {
    _drawCharacter(character, character.id === activeCharacterId, scalingFactors, context, time)
  });
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

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent) {
  const { time } = event;
  for(let i = 0; i < gameState.characters.length; ++i) {
    const character = gameState.characters[i];
    const position = findCharacterScrubPosition(character, time);
    character.x = position.x;
    character.y = position.y;
  }
  gameState.time = time;
  gameState.isPlaying = false;
}

function _updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent) {
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.realTimeToGameTimeOffset = gameState.time - Date.now();
  } else {
    gameState.realTimeToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
  }
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

  // Find nearest character by Euclidean distance in game position
  let nearest:Character = gameState.characters[0];
  let nearestDist = Math.hypot(nearest.x - x, nearest.y - y);
  for (let i = 1; i < gameState.characters.length; ++i) {
    const c = gameState.characters[i];
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

function _updateCharacterPosition(character:Character, time:number) {
  const position = findCharacterPosition(character, time);
  character.x = position.x;
  character.y = position.y;
}

function _updateCharacterPositions(characters:Character[], time:number) {
  characters.forEach(c => _updateCharacterPosition(c, time));
}

function _updateGameState(gameState:GameState, events:PlayerEvent[]) {
  events.forEach(event => {
    switch(event.type) {
      case PlayerEventType.CHANGE_TIME: _updateGameStateForChangeTime(gameState, event as ChangeTimeEvent); break;
      case PlayerEventType.PLAY_PAUSE: _updateGameStateForPlayPause(gameState, event as PlayPauseEvent); break;
      case PlayerEventType.MOUSEDOWN: _updateGameStateForMouseDown(gameState, event as MouseDownEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    gameState.time = Date.now() + gameState.realTimeToGameTimeOffset;
    _updateCharacterPositions(gameState.characters, gameState.time);
  }
  _setActiveRoomDiscovered(gameState);
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
  }
  return scalingFactors;
}

function _drawGameState(gameState:GameState, context:CanvasRenderingContext2D) {
  const activeCharacterId = gameState.characters[gameState.activeCharacterI]?.id;
  for(let roomI = 0; roomI < gameState.rooms.length; ++roomI) {
    const room = gameState.rooms[roomI];
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = charactersInRoom.some(character => character.id === activeCharacterId);
    _drawRoom(room, charactersInRoom, isActive, activeCharacterId, gameState.scalingFactors, context, gameState.time);
  }
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

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D, onMinutesChanged:(minutes:number) => void) {
  context.fillStyle = "#000";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  if (!gameState) return;

  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events);
  _callOnMinutesChangedAsNeeded(gameState, onMinutesChanged);

  _updateScalingFactorsAsNeeded(gameState, context);
  _drawGameState(gameState, context);
}

export function createGameStateFromLevel(level:Level):GameState {
  const gameState:GameState = {
    characters:level.characters.map(duplicateCharacter),
    rooms:level.rooms.map(duplicateRoom),
    activeCharacterI:_findCharacterI(level.characters, level.activeCharacterId),
    isPlaying:false,
    time:0,
    realTimeToGameTimeOffset:0,
    scalingFactors:ZERO_SCALING_FACTORS,
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN
  }
  gameState.characters.forEach(character => character.scrubPositions = generateScrubPositions(character.itinerary));
  _setActiveRoomDiscovered(gameState);
  return gameState;
}