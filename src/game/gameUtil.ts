import { assertNonNullable, botch } from "decent-portal";
import Character, { duplicateCharacter } from "./types/Character";
import GameState from "./types/GameState";
import Room, { duplicateRoom } from "./types/Room";
import RoomExit from "./types/RoomExit";
import ChangeTimeEvent from "./types/playerEvents/ChangeTimeEvent";
import { findCharacterPosition, findCharacterScrubCoords, generateScrubCoords } from "./itineraryUtil";
import { calcRoomsBoundingRect, findCharactersInRoom, findRoomAtCoords } from "./roomUtil";
import PlayerEvent from "./types/playerEvents/PlayerEvent";
import PlayerEventType from "./types/playerEvents/PlayerEventType";
import { popPlayerEvents } from "./playerEventUtil";
import Level from "./types/Level";
import PlayPauseEvent from "./types/playerEvents/PlayPauseEvent";

const ROOM_FONT_HEIGHT_RATIO = 0.02; // Font height as a ratio of the canvas height.
const ROOM_LINE_WIDTH = 0.005;

type ScalingFactors = {
  scaleX:number,
  translateX:number,
  scaleY:number
  translateY:number,
  roomFontHeight:number,
  roomLineWidth:number
}

function _scaleCoords(x:number, y:number, scalingFactors:ScalingFactors):[x:number, y:number] {
  return [x * scalingFactors.scaleX + scalingFactors.translateX, y * scalingFactors.scaleY + scalingFactors.translateY];
}

// Calculate scaling factors that will translate a rect of sourceWidth and sourceHeight dimensions so that
// it will fit centered insides of a rect of destWidth and destHeight, while maintaining the orginal aspect
// ratio of the source rect.
function _calcScalingFactors(sourceWidth:number, sourceHeight:number, destWidth:number, destHeight:number):ScalingFactors {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    // Will make a visible problem but maybe not crash anything. Potentially useful for edge cases.
    return {scaleX:0, translateX:0, scaleY:0, translateY:0, roomFontHeight:0, roomLineWidth:0}; 
  }
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const destAspectRatio = destWidth / destHeight;
  let scaleX, translateX, scaleY, translateY;
  if (sourceAspectRatio > destAspectRatio) { // The source rect is wider than the destination rect. Scale based on width.
    scaleX = scaleY = destWidth / sourceWidth;
    translateX = 0;
    translateY = (destHeight - sourceHeight * scaleY) / 2;
  } else { // The source rect is taller than the destination rect. Scale based on height.
    scaleX = scaleY = destHeight / sourceHeight;
    translateX = (destWidth - sourceWidth * scaleX) / 2;
    translateY = 0;
  }
  const roomFontHeight = Math.round(destHeight * ROOM_FONT_HEIGHT_RATIO);
  const roomLineWidth = Math.max(1, destHeight * ROOM_LINE_WIDTH);
  return {scaleX, translateX, scaleY, translateY, roomFontHeight, roomLineWidth};
}

function _drawRoomExit(exit:RoomExit, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [exitX, exitY] = _scaleCoords(exit.x, exit.y, scalingFactors);
  const left = exitX - roomLineWidth;
  const top = exitY - roomLineWidth;
  const width = roomLineWidth * 3;
  const height = roomLineWidth * 3;
  context.fillRect(left, top, width, height);
}

function _drawRoom(room:Room, charactersInRoom:Character[], isActive:boolean, 
      scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  if (!room.isDiscovered) return;
  const scaledTopLeft = _scaleCoords(room.rect.x, room.rect.y, scalingFactors);
  const scaledBottomRight = _scaleCoords(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
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
  if (isActive) charactersInRoom.forEach(character => _drawCharacter(character, scalingFactors, context));
}

// Draw a stick figure inside the rect of the character.
function _drawCharacter(character:Character, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const { roomLineWidth } = scalingFactors;
  const [centerX, bottomY] = _scaleCoords(character.x, character.y, scalingFactors);
  const characterWidth = roomLineWidth * 5;
  const characterHeight = roomLineWidth * 10;
  const centerY = Math.round(bottomY - characterHeight / 2);
  const headRadius = Math.min(characterWidth, characterHeight) / 4;
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.arc(centerX, centerY - characterHeight / 4, headRadius, 0, 2 * Math.PI); // Head
  context.moveTo(centerX, centerY - characterHeight / 4 + headRadius); // Move to neck
  context.lineTo(centerX, centerY + characterHeight / 4); // Body
  context.moveTo(centerX, centerY); // Move to middle of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 8); // Left arm
  context.moveTo(centerX, centerY); // Move back to middle of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 8); // Right arm
  context.moveTo(centerX, centerY + characterHeight / 4); // Move to bottom of body
  context.lineTo(centerX - characterWidth / 2, centerY + characterHeight / 2); // Left leg
  context.moveTo(centerX, centerY + characterHeight / 4); // Move back to bottom of body
  context.lineTo(centerX + characterWidth / 2, centerY + characterHeight / 2); // Right leg
  context.stroke();
}

export function findCharacter(gameState:GameState, characterId:string):Character {
  const character = gameState.characters.find((c) => c.id === characterId);
  assertNonNullable(character, `character with id ${characterId} not found`);
  return character;
}

function _setActiveRoomDiscovered(gameState:GameState) {
  const activeCharacter = gameState.characters[gameState.activeCharacterI];
  if (activeCharacter) {
    const activeRoom = findRoomAtCoords(gameState.rooms, activeCharacter.x, activeCharacter.y);
    if (activeRoom) activeRoom.isDiscovered = true;
  }
}

function _updateGameStateForChangeTime(gameState:GameState, event:ChangeTimeEvent) {
  const { time } = event;
  for(let i = 0; i < gameState.characters.length; ++i) {
    const character = gameState.characters[i];
    const coords = findCharacterScrubCoords(character, time);
    character.x = coords.x;
    character.y = coords.y;
  }
  gameState.time = time;
  gameState.isPlaying = false;
}

function _updateGameStateForPlayPause(gameState:GameState, event:PlayPauseEvent) {
  gameState.isPlaying = event.isPlaying;
  if (event.isPlaying) {
    gameState.realToGameTimeOffset = gameState.time - Date.now();
  } else {
    gameState.realToGameTimeOffset = 0; // To find errors if code incorrectly assumes the value to be set.
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
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    gameState.time = Date.now() + gameState.realToGameTimeOffset;
    console.log('time = ' + gameState.time);
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

export function updateAndDraw(gameState:GameState|null, context:CanvasRenderingContext2D) {
  context.fillStyle = "#000";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  if (!gameState) return;

  const events:PlayerEvent[] = popPlayerEvents();
  _updateGameState(gameState, events);
  const roomsBoundingRect = calcRoomsBoundingRect(gameState.rooms);
  const scalingFactors = _calcScalingFactors(roomsBoundingRect.width, roomsBoundingRect.height, context.canvas.width, context.canvas.height);
  for(let roomI = 0; roomI < gameState.rooms.length; ++roomI) {
    const room = gameState.rooms[roomI];
    const charactersInRoom = findCharactersInRoom(room, gameState.characters);
    const isActive = charactersInRoom.includes(gameState.characters[gameState.activeCharacterI]);
    _drawRoom(room, charactersInRoom, isActive, scalingFactors, context);
  }
}

export function createGameStateFromLevel(level:Level):GameState {
  const gameState:GameState = {
    characters:level.characters.map(duplicateCharacter),
    rooms:level.rooms.map(duplicateRoom),
    activeCharacterI:_findCharacterI(level.characters, level.activeCharacterId),
    isPlaying:false,
    time:0,
    realToGameTimeOffset:0
  }
  gameState.characters.forEach(character => character.scrubCoords = generateScrubCoords(character.itinerary));
  _setActiveRoomDiscovered(gameState);
  return gameState;
}