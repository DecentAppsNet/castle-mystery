import { describe, expect, it } from 'vitest';

import { TURN_RADIANS_PER_SECOND, createFacingEvent, createItineraryIndex, createWalkEvent, findCharacterPose, findPreviousRoomEntryTime } from '../itineraryUtil';
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
    obstructions:[],
    exits:[],
    waypoints:[],
    positionMarkersById:{},
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
    facingAngle:0,
    faceImageUrl:null,
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

  describe('createFacingEvent()', () => {
    it('sets duration from the configured turn speed', () => {
      const facingEvent = createFacingEvent(1_000, 0, Math.PI / 2);

      expect(facingEvent.type).toBe(ItineraryEventType.FACING);
      expect(facingEvent.fromFacingAngle).toBe(0);
      expect(facingEvent.facingAngle).toBe(Math.PI / 2);
      expect(facingEvent.duration).toBe(Math.ceil(((Math.PI / 2) / TURN_RADIANS_PER_SECOND) * 1_000));
    });
  });

  describe('findCharacterPose()', () => {
    it('interpolates turning and walking independently when they overlap', () => {
      const room = _createRoom();
      const walkResult = createWalkEvent(room, 1_000, 0, 0, 10, 0);
      expect(walkResult.event).not.toBeNull();

      const facingEvent = createFacingEvent(1_000, 0, Math.PI / 2);
      const character = _createCharacter([facingEvent, walkResult.event!]);

      const overlappingPose = findCharacterPose(character, 1_125);
      expect(overlappingPose.position.x).toBeGreaterThan(0);
      expect(overlappingPose.position.x).toBeLessThan(10);
      expect(overlappingPose.facingAngle).toBeCloseTo(Math.PI / 4, 1);

      const postTurnPose = findCharacterPose(character, 1_275);
      expect(postTurnPose.position.x).toBeGreaterThan(overlappingPose.position.x);
      expect(postTurnPose.position.x).toBeLessThan(10);
      expect(postTurnPose.facingAngle).toBeCloseTo(Math.PI / 2);
    });
  });
});
