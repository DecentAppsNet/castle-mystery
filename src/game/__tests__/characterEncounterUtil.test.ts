// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { addCharacterEncounterEvents } from '../characterEncounterUtil';
import { createItineraryIndex } from '../itineraryUtil';
import Character from '../types/Character';
import Itinerary from '../types/Itinerary';
import Room from '../types/Room';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import Waypoint from '../types/Waypoint';
import CharacterEncounterEvent from '../types/itineraryEvents/CharacterEncounterEvent';

function _createWaypoint(x:number, y:number):Waypoint {
  return { position:{ x, y }, adjacentWaypoints:[], exitDirections:{} };
}

function _createRoom(id:string, x:number):Room {
  return {
    id,
    title:id,
    rect:{ x, y:0, width:100, height:100 },
    items:[],
    exits:[],
    stairs:[],
    waypoints:[],
    isDiscovered:false,
    isObscured:false
  };
}

function _createCharacter(id:string, x:number, y:number, itinerary:Itinerary = []):Character {
  return {
    id,
    title:id,
    randomSalt:0,
    description:id,
    isTitleKnown:true,
    items:[],
    x,
    y,
    waypoint:_createWaypoint(x, y),
    faceImageUrl:null,
    discoveredRoomIds:[],
    itinerary,
    itineraryIndex:createItineraryIndex(itinerary, { x, y })
  };
}

describe('characterEncounterUtil', () => {
  it('creates encounter events when a character enters an occupied room', () => {
    const rooms = [_createRoom('A', 0), _createRoom('B', 100)];
    const alice = _createCharacter('Alice', 10, 10, [
      { type:ItineraryEventType.WALK, startTime:0, duration:1_000, fromPosition:{ x:10, y:10 }, toPosition:{ x:150, y:10 } },
      { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'B' }
    ]);
    const bob = _createCharacter('Bob', 150, 10);

    const characters = addCharacterEncounterEvents([alice, bob], rooms);
    const aliceEncounterEvents = characters[0].itinerary.filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER) as CharacterEncounterEvent[];
    const bobEncounterEvents = characters[1].itinerary.filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER) as CharacterEncounterEvent[];

    expect(aliceEncounterEvents).toEqual([
      { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_000, duration:0, encounteredCharacterIds:['Bob'] }
    ]);
    expect(bobEncounterEvents).toEqual([
      { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_000, duration:0, encounteredCharacterIds:['Alice'] }
    ]);
  });

  it('groups simultaneous encountered characters into one event', () => {
    const rooms = [_createRoom('A', 0), _createRoom('B', 100), _createRoom('C', 200)];
    const alice = _createCharacter('Alice', 150, 10);
    const bob = _createCharacter('Bob', 10, 10, [
      { type:ItineraryEventType.WALK, startTime:0, duration:1_000, fromPosition:{ x:10, y:10 }, toPosition:{ x:150, y:10 } },
      { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'B' }
    ]);
    const charlie = _createCharacter('Charlie', 210, 10, [
      { type:ItineraryEventType.WALK, startTime:0, duration:1_000, fromPosition:{ x:210, y:10 }, toPosition:{ x:160, y:10 } },
      { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'B' }
    ]);

    const characters = addCharacterEncounterEvents([alice, bob, charlie], rooms);
    const aliceEncounterEvents = characters[0].itinerary.filter(event => event.type === ItineraryEventType.CHARACTER_ENCOUNTER) as CharacterEncounterEvent[];

    expect(aliceEncounterEvents).toEqual([
      { type:ItineraryEventType.CHARACTER_ENCOUNTER, startTime:1_000, duration:0, encounteredCharacterIds:['Bob', 'Charlie'] }
    ]);
  });
});
