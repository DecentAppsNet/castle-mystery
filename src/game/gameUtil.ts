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
import { findVisibleCharactersInRoom } from "./characterDrawUtil";
import { drawRoom } from "./roomDrawUtil";
import { COLOR_BLACK } from "./drawConstants";

const UPDATE_MINUTES_REAL_TIME_INTERVAL = 200;

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

function _pauseGameState(gameState:GameState) {
  gameState.isPlaying = false;
  gameState.realTimeToGameTimeOffset = 0;
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

function _updateGameStateForMouseMove(_gameState:GameState, event:MouseMoveEvent) {
  console.log(event.x, event.y);
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
      case PlayerEventType.MOUSEMOVE: _updateGameStateForMouseMove(gameState, event as MouseMoveEvent); break;
      default: botch();
    }
  });
  if (gameState.isPlaying) {
    const nextTime = Math.min(gameState.duration, Date.now() + gameState.realTimeToGameTimeOffset);
    gameState.time = nextTime;
    _updateCharacterPositions(gameState.characters, gameState.time);
    if (nextTime >= gameState.duration) _pauseGameState(gameState);
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
    drawRoom(room, charactersInRoom, isActive, activeCharacter, gameState.scalingFactors, context, gameState.time, gameState.isPlaying);
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