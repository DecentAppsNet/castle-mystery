import { assertNonNullable } from "decent-portal";
import Room from "./types/Room";
import Timeline from "./types/Timeline";
import TimelineKeyframe from "./types/TimelineKeyframe";
import Character from "./types/Character";
import GameState from "./types/GameState";

function _createSnapshotRooms(initialRooms:Room[], timeline:Timeline, snapshot:TimelineKeyframe):Room[] {
  return initialRooms.map(room => {
    const roomI = timeline.roomIdToI[room.id];
    assertNonNullable(roomI);
    const items = [...snapshot.rooms[roomI].items];
    return {...room, items};
  });
}

function _createSnapshotCharacters(initialCharacters:Character[], timeline:Timeline, snapshot:TimelineKeyframe):Character[] {
  return initialCharacters.map(character => {
    const characterI = timeline.characterIdToI[character.id];
    assertNonNullable(characterI);
    return {...character, ...snapshot.characters[characterI]};
  });
}

export function createSnapshotCharactersAndRooms(gameState:GameState):{snapshotRooms:Room[], snapshotCharacters:Character[]} {
  const snapshotRooms = _createSnapshotRooms(gameState.initialRooms, gameState.timeline, gameState.timelineSnapshot);
  const snapshotCharacters = _createSnapshotCharacters(gameState.initialCharacters, gameState.timeline, gameState.timelineSnapshot);
  return { snapshotRooms, snapshotCharacters };
}