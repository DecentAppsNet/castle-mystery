// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createItineraryIndex, createWalkEvent, findCharacterPose, findPreviousRoomEntryTime } from '../itineraryUtil';
import { FLOOR_WAYPOINT_Y_OFFSET } from '../roomUtil';
import Character from '../types/Character';
import Room from '../types/Room';
import ItineraryEvent from '../types/itineraryEvents/ItineraryEvent';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import RoomEntryEvent from '../types/itineraryEvents/RoomEntryEvent';
import Waypoint from '../types/Waypoint';

function _createWaypoint(x:number, y:number):Waypoint {
  return { position:{ x, y }, adjacentWaypoints:[], exitDirections:{} };
}

function _createRoom():Room {
  return {
    id:'Room',
    title:'Room',
    rect:{ x:0, y:0, width:100, height:100 },
    items:[],
    exits:[],
    stairs:[],
    waypoints:[],
    isDiscovered:false,
    isObscured:false
  };
}

function _createCharacter(itinerary:ItineraryEvent[]):Character {
  const waypoint = _createWaypoint(0, 0);
  return {
    id:'Hero',
    title:'Hero',
    randomSalt:0,
    description:'Hero',
    isTitleKnown:true,
    items:[],
    x:0,
    y:0,
    waypoint,
    faceImageUrl:null,
    discoveredRoomIds:[],
    itinerary,
    itineraryIndex:createItineraryIndex(itinerary, { x:0, y:0 })
  };
}

describe('itineraryUtil', () => {
  describe('createItineraryIndex()', () => {
    it('includes time zero as the initial room-entry time', () => {
      const roomEntryEvent:RoomEntryEvent = { type:ItineraryEventType.ROOM_ENTRY, startTime:1_000, duration:0, roomId:'Library' };
      const character = _createCharacter([roomEntryEvent]);

      expect(character.itineraryIndex.roomEntryStartTimes).toEqual([0, 1_000]);
      expect(findPreviousRoomEntryTime(character, 1_000)).toBe(0);
    });
  });

  describe('findCharacterPose()', () => {
    it('interpolates walking position over time', () => {
      const room = _createRoom();
      const walkEvent = createWalkEvent(room, 1_000, 0, 0, 10, 0);
      expect(walkEvent).not.toBeNull();

      const character = _createCharacter([walkEvent!]);

      const midWalkPose = findCharacterPose(character, 1_125);
      expect(midWalkPose.position.x).toBeGreaterThan(0);
      expect(midWalkPose.position.x).toBeLessThan(10);

      const laterPose = findCharacterPose(character, 1_275);
      expect(laterPose.position.x).toBeGreaterThan(midWalkPose.position.x);
      expect(laterPose.position.x).toBeLessThan(10);
    });

    it('preserves near-floor waypoint y positions while walking', () => {
      const room = _createRoom();
      const floorY = 20 - FLOOR_WAYPOINT_Y_OFFSET;
      const walkEvent = createWalkEvent(room, 1_000, 10, floorY, 15, floorY);
      expect(walkEvent).not.toBeNull();

      const character = _createCharacter([walkEvent!]);
      character.x = 10;
      character.y = floorY;
      character.itineraryIndex = createItineraryIndex(character.itinerary, { x:character.x, y:character.y });

      const midWalkPose = findCharacterPose(character, 1_075);
      expect(midWalkPose.position.y).toBe(floorY);
      expect(midWalkPose.position.x).toBeGreaterThan(10);
      expect(midWalkPose.position.x).toBeLessThan(15);
    });
  });
});
