import { assertNonNullable, botch } from "decent-portal";
import Character, { duplicateCharacter } from "./types/Character";
import GameState from "./types/GameState";
import Room, { duplicateRoom } from "./types/Room";
import RoomExit from "./types/RoomExit";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import { findCharacterPose } from "./itineraryUtil";
import { calcRoomsBoundingRect, findCharactersInRoom, findRoomAtPosition } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";
import { msecsToMinutes } from "@/homeScreen/interactions/gameplay";
import { clamp } from "@/common/numberUtil";
import ScalingFactors from "./types/ScalingFactors";
import { gameToCanvasPosition, calcScalingFactors, ZERO_SCALING_FACTORS } from "./drawUtil";
import Rect from "./types/Rect";
import MouseDownEvent from "./types/playerEvents/MouseDownEvent";
import Position from "./types/Position";
import { calcVisibilityPolygon, isPositionInVisibilityCone } from "./visibilityUtil";

const CHARACTER_SWAY_INTERVAL = 1500; // ms for full left-right-left cycle
const CHARACTER_SWAY_AMOUNT = 1; // pixels to sway left/right from center    
const UPDATE_MINUTES_REAL_TIME_INTERVAL = 200;
const VISIBILITY_CONE_ANGLE = Math.PI / 2;

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

function _getCharacterVisibilityOrigin(character:Character, scalingFactors:ScalingFactors):Position {
  const characterHeightPixels = scalingFactors.roomLineWidth * 10;
  const characterHeightGame = characterHeightPixels / scalingFactors.scaleY;
  return {
    x: character.x,
    y: character.y - characterHeightGame * 0.75
  };
}

function _drawVisibilityCone(activeCharacter:Character, room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const visibilityOrigin = _getCharacterVisibilityOrigin(activeCharacter, scalingFactors);
  const visibilityPolygon = calcVisibilityPolygon(visibilityOrigin, activeCharacter.facingAngle, room.rect, VISIBILITY_CONE_ANGLE);
  if (visibilityPolygon.length < 3) return;

  context.fillStyle = "#ffe60040";
  context.beginPath();
  const [startX, startY] = gameToCanvasPosition(visibilityPolygon[0].x, visibilityPolygon[0].y, scalingFactors);
  context.moveTo(startX, startY);
  for (let i = 1; i < visibilityPolygon.length; ++i) {
    const point = visibilityPolygon[i];
    const [pointX, pointY] = gameToCanvasPosition(point.x, point.y, scalingFactors);
    context.lineTo(pointX, pointY);
  }
  context.closePath();
  context.fill();
}

function _findVisibleCharactersInRoom(charactersInRoom:Character[], activeCharacter:Character, scalingFactors:ScalingFactors):Character[] {
  const visibilityOrigin = _getCharacterVisibilityOrigin(activeCharacter, scalingFactors);
  return charactersInRoom.filter(character => {
    if (character.id === activeCharacter.id) return true;
    return isPositionInVisibilityCone(
      visibilityOrigin,
      { x: character.x, y: character.y },
      activeCharacter.facingAngle,
      VISIBILITY_CONE_ANGLE
    );
  });
}

function _drawSpeechBubble(speech:string, anchorX:number, anchorTopY:number, room:Room,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const padding = Math.max(4, scalingFactors.roomLineWidth * 1.5);
  const fontSize = Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.8));
  const boxHeight = fontSize + padding * 2;
  const [roomLeft, roomTop] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [roomRight, roomBottom] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  context.save();
  context.font = `${fontSize}px Jellee`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const boxWidth = context.measureText(speech).width + padding * 2;
  const unclampedLeft = anchorX - boxWidth / 2;
  const unclampedTop = anchorTopY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = Math.round(clamp(unclampedLeft, roomLeft, roomRight - boxWidth));
  const top = Math.round(clamp(unclampedTop, roomTop, roomBottom - boxHeight));
  context.fillStyle = "#fff8cc";
  context.strokeStyle = "#333";
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth / 2);
  context.fillRect(left, top, boxWidth, boxHeight);
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.fillStyle = "#000";
  context.fillText(speech, left + boxWidth / 2, top + boxHeight / 2);
  context.restore();
}

// Draw a stick figure inside the rect of the character.
function _drawCharacter(character:Character, room:Room, scalingFactors:ScalingFactors, 
      context:CanvasRenderingContext2D, time:number, speech:string|null) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = gameToCanvasPosition(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.strokeStyle = "#000";
  const swayPhase = (time % CHARACTER_SWAY_INTERVAL) / CHARACTER_SWAY_INTERVAL; // 0..1
  const sway = Math.sin(swayPhase * 2 * Math.PI) * CHARACTER_SWAY_AMOUNT; // easing via sine
  const backboneX = centerX + sway;
  if (speech) _drawSpeechBubble(speech, backboneX, centerY - characterHeight / 2, room, scalingFactors, context);
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

function _drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, activeCharacter:Character|null,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, time:number, isPlaying:boolean) {
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
  if (isActive && activeCharacter) _drawVisibilityCone(activeCharacter, room, scalingFactors, context);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#999";
  context.font = `${scalingFactors.roomFontHeight}px Jellee`;
  context.fillText(room.title, scaledTopLeft[0] + scaledWidth / 2, scaledTopLeft[1] + scaledHeight / 2);
  context.fillStyle = "#000";
  room.exits.forEach(exit => _drawRoomExit(exit, scalingFactors, context));
  if (isActive && activeCharacter) {
    const visibleCharacters = _findVisibleCharactersInRoom(charactersInRoom, activeCharacter, scalingFactors);
    visibleCharacters.forEach(character => {
      const speech = isPlaying ? findCharacterPose(character, time).speech : null;
      _drawCharacter(character, room, scalingFactors, context, time, speech);
    });
  }
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
    const pose = findCharacterPose(character, time);
    character.x = pose.position.x;
    character.y = pose.position.y;
    character.facingAngle = pose.facingAngle;
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
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  const activeRoom = activeCharacter ? findRoomAtPosition(gameState.rooms, activeCharacter.x, activeCharacter.y) : null;
  const candidateCharacters = activeCharacter && activeRoom
    ? _findVisibleCharactersInRoom(findCharactersInRoom(activeRoom, gameState.characters), activeCharacter, gameState.scalingFactors)
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

function _updateCharacterPosition(character:Character, time:number) {
  const pose = findCharacterPose(character, time);
  character.x = pose.position.x;
  character.y = pose.position.y;
  character.facingAngle = pose.facingAngle;
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
  const activeCharacter = gameState.characters[gameState.activeCharacterI] || null;
  for(let roomI = 0; roomI < gameState.rooms.length; ++roomI) {
    const room = gameState.rooms[roomI];
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = activeCharacter ? charactersInRoom.some(character => character.id === activeCharacter.id) : false;
    _drawRoom(room, charactersInRoom, isActive, activeCharacter, gameState.scalingFactors, context, gameState.time, gameState.isPlaying);
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
    duration:level.duration,
    realTimeToGameTimeOffset:0,
    labels:level.labels.map(label => ({...label})),
    scalingFactors:ZERO_SCALING_FACTORS,
    lastMinutesChangedCallRealTime:0,
    lastMinutesChangedValue:NaN
  }
  _setActiveRoomDiscovered(gameState);
  return gameState;
}