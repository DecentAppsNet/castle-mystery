// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { createBodyOrientationEvent, createDieEvent, createEmitEvent, createFaceEvent, createItineraryIndex, createWalkEvent, findCharacterPose, findPreviousRoomEntryTime } from '../itineraryUtil';
import { ROOM_BACK_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import { FLOOR_WAYPOINT_Y_OFFSET } from '../waypointUtil';
import Character, { createDefaultCharacter } from '../types/Character';
import { createDefaultRoom } from '../types/Room';
import ItineraryEvent from '../types/itineraryEvents/ItineraryEvent';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import RoomEntryEvent from '../types/itineraryEvents/RoomEntryEvent';
import Waypoint from '../types/Waypoint';

const BACK_ROW_Z = ROOM_BACK_Z;
const MIDDLE_ROW_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;
const FRONT_ROW_DEPTH = ROOM_FRONT_ROW_CENTER_Z;

function _createWaypoint(x:number, y:number):Waypoint {
  return { position:{ x, y, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} };
}

function _createRoom() {
  return {
    ...createDefaultRoom(),
    id:'Room',
    title:'Room',
    rect:{ x:0, y:0, width:100, height:100 }
  };
}

function _createCharacter(itinerary:ItineraryEvent[]):Character {
  const waypoint = _createWaypoint(0, 0);
  return {
    ...createDefaultCharacter(),
    id:'Hero',
    title:'Hero',
    description:'Hero',
    position:{ x:0, y:0, z:MIDDLE_ROW_DEPTH },
    waypoint,
    itinerary,
    itineraryIndex:createItineraryIndex(itinerary, { x:0, y:0, z:MIDDLE_ROW_DEPTH })
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
      character.position = { x:10, y:floorY, z:MIDDLE_ROW_DEPTH };
      character.itineraryIndex = createItineraryIndex(character.itinerary, character.position);

      const midWalkPose = findCharacterPose(character, 1_075);
      expect(midWalkPose.position.y).toBe(floorY);
      expect(midWalkPose.position.x).toBeGreaterThan(10);
      expect(midWalkPose.position.x).toBeLessThan(15);
    });

    it('creates z-only walk events between waypoints at the same x and y', () => {
      const room = _createRoom();
      const walkEvent = createWalkEvent(room, 1_000, 10, 10, 10, 10,
        { x:10, y:10, z:MIDDLE_ROW_DEPTH }, { x:10, y:10, z:FRONT_ROW_DEPTH });
      expect(walkEvent).not.toBeNull();

      const character = _createCharacter([walkEvent!]);
      character.position = { x:10, y:10, z:MIDDLE_ROW_DEPTH };
      character.itineraryIndex = createItineraryIndex(character.itinerary, { x:10, y:10, z:MIDDLE_ROW_DEPTH });

      const midWalkPose = findCharacterPose(character, walkEvent!.startTime + Math.floor(walkEvent!.duration / 2));
      expect(midWalkPose.position.x).toBe(10);
      expect(midWalkPose.position.y).toBe(10);
      expect(midWalkPose.position.z).toBeGreaterThan(MIDDLE_ROW_DEPTH);
      expect(midWalkPose.position.z).toBeLessThan(FRONT_ROW_DEPTH);
    });

    it('faces in the direction of the latest horizontal walk once that walk starts', () => {
      const room = _createRoom();
      const walkRightEvent = createWalkEvent(room, 1_000, 0, 0, 10, 0);
      const walkLeftEvent = createWalkEvent(room, 2_000, 10, 0, 2, 0);
      expect(walkRightEvent).not.toBeNull();
      expect(walkLeftEvent).not.toBeNull();

      const character = _createCharacter([walkRightEvent!, walkLeftEvent!]);

      expect(findCharacterPose(character, 999).facingDirection).toBe('right');
      expect(findCharacterPose(character, 1_000).facingDirection).toBe('right');
      expect(findCharacterPose(character, 2_000).facingDirection).toBe('left');
      expect(findCharacterPose(character, 2_500).facingDirection).toBe('left');
    });

    it('applies explicit face events immediately at their start time', () => {
      const character = _createCharacter([createFaceEvent(1_000, 'left')]);

      expect(findCharacterPose(character, 999).facingDirection).toBe('right');
      expect(findCharacterPose(character, 1_000).facingDirection).toBe('left');
      expect(findCharacterPose(character, 1_500).facingDirection).toBe('left');
    });

    it('applies explicit body-orientation events immediately and resets to standing when walking starts', () => {
      const room = _createRoom();
      const walkEvent = createWalkEvent(room, 2_000, 0, 0, 10, 0);
      expect(walkEvent).not.toBeNull();

      const character = _createCharacter([createBodyOrientationEvent(1_000, 'kneeling'), walkEvent!]);

      expect(findCharacterPose(character, 999).bodyOrientation).toBe('standing');
      expect(findCharacterPose(character, 1_000).bodyOrientation).toBe('kneeling');
      expect(findCharacterPose(character, 1_999).bodyOrientation).toBe('kneeling');
      expect(findCharacterPose(character, 2_000).bodyOrientation).toBe('standing');
      expect(findCharacterPose(character, 2_500).bodyOrientation).toBe('standing');
    });

    it('ignores emit events when reconstructing character pose', () => {
      const character = _createCharacter([createEmitEvent(1_000, 'bell', '(clang)')]);

      expect(findCharacterPose(character, 999)).toMatchObject({
        position:{ x:0, y:0, z:MIDDLE_ROW_DEPTH },
        facingDirection:'right',
        bodyOrientation:'standing',
        isAlive:true,
        speech:null,
        thought:null
      });
      expect(findCharacterPose(character, 1_500)).toMatchObject({
        position:{ x:0, y:0, z:MIDDLE_ROW_DEPTH },
        facingDirection:'right',
        bodyOrientation:'standing',
        isAlive:true,
        speech:null,
        thought:null
      });
    });

    it('applies death events immediately and keeps characters dead afterwards', () => {
      const character = _createCharacter([createDieEvent(1_000)]);

      expect(findCharacterPose(character, 999).isAlive).toBe(true);
      expect(findCharacterPose(character, 1_000).isAlive).toBe(false);
      expect(findCharacterPose(character, 1_500).isAlive).toBe(false);
    });
  });
});
