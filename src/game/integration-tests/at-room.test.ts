// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { planMovementToRoom } from '@/levelLoading/activities/activityUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { findRoom } from '../roomUtil';
import { findExitWaypoint, findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from '../waypointUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import WalkEvent from '../types/itineraryEvents/WalkEvent';
import RoomEntryEvent from '../types/itineraryEvents/RoomEntryEvent';
import afterPreviousActivityAtRoomText from './fixtures/after-previous-activity-at-room.md?raw';
import atRoomDefaultStairRoomText from './fixtures/at-room-default-stair-room.md?raw';
import atRoomMarkerSameRoomText from './fixtures/at-room-marker-same-room.md?raw';
import atRoomMarkerText from './fixtures/at-room-marker.md?raw';
import atRoomMiddleRowVisitText from './fixtures/at-room-middle-row-visit.md?raw';
import atRoomPercentClaimedInteriorText from './fixtures/at-room-percent-claimed-interior.md?raw';
import atLibraryViaFoyerText from './fixtures/at-library-via-foyer.md?raw';

function _positionsEqual(position1:{ x:number, y:number }, position2:{ x:number, y:number }) {
  return position1.x === position2.x && position1.y === position2.y;
}

function _findPreviousEvent<T>(events:readonly unknown[], startIndex:number, predicate:(event:unknown) => boolean):T | undefined {
  for (let i = startIndex - 1; i >= 0; --i) {
    if (predicate(events[i])) return events[i] as T;
  }
  return undefined;
}

function _findMiddleFloorWaypointNearestRoomCenter(room:ReturnType<typeof findRoom>) {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  return room.waypoints.reduce((nearestFloorWaypoint, waypoint) => {
    if (waypoint.position.y !== floorY || waypoint.position.z !== WAYPOINT_MIDDLE_ROW_Z) return nearestFloorWaypoint;
    if (!nearestFloorWaypoint) return waypoint;
    const nearestDistance = Math.abs(nearestFloorWaypoint.position.x - centerX);
    const distance = Math.abs(waypoint.position.x - centerX);
    return distance < nearestDistance ? waypoint : nearestFloorWaypoint;
  }, null as typeof room.waypoints[number] | null);
}

function _findLeftmostMiddleFloorWaypoint(room:ReturnType<typeof findRoom>) {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return room.waypoints.reduce((leftmostFloorWaypoint, waypoint) => {
    if (waypoint.position.y !== floorY || waypoint.position.z !== WAYPOINT_MIDDLE_ROW_Z) return leftmostFloorWaypoint;
    if (!leftmostFloorWaypoint) return waypoint;
    return waypoint.position.x < leftmostFloorWaypoint.position.x ? waypoint : leftmostFloorWaypoint;
  }, null as typeof room.waypoints[number] | null);
}

function _findInteriorMiddleFloorWaypointsByDescendingX(room:ReturnType<typeof findRoom>) {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return room.waypoints
    .filter(waypoint => waypoint.position.y === floorY
      && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
      && waypoint.position.x > room.rect.x
      && waypoint.position.x < room.rect.x + room.rect.width)
    .sort((waypoint1, waypoint2) => waypoint2.position.x - waypoint1.position.x);
}

function _createWaypointKey(position:{ x:number, y:number, z:number }) {
  return `${position.x},${position.y},${position.z}`;
}

function _findLastWalkEvent(events:readonly { type:ItineraryEventType }[]):WalkEvent | undefined {
  return [...events].reverse().find(event => event.type === ItineraryEventType.WALK) as WalkEvent | undefined;
}

function _findWalkEventsForRoomVisit(itinerary:readonly (WalkEvent | RoomEntryEvent)[], roomId:string):WalkEvent[] {
  const roomEntryEventIndex = itinerary.findIndex(event => event.type === ItineraryEventType.ROOM_ENTRY
    && (event as RoomEntryEvent).roomId === roomId);
  expect(roomEntryEventIndex).toBeGreaterThanOrEqual(0);
  const nextRoomEntryEventIndex = itinerary.findIndex((event, index) => index > roomEntryEventIndex
    && event.type === ItineraryEventType.ROOM_ENTRY);
  const endIndex = nextRoomEntryEventIndex >= 0 ? nextRoomEntryEventIndex : itinerary.length;
  return itinerary.slice(roomEntryEventIndex + 1, endIndex).filter(event => event.type === ItineraryEventType.WALK) as WalkEvent[];
}

function _expectRoutesThroughPairedExitWaypoints(levelText:string) {
  const level = loadLevelFromText(levelText);
  const queen = level.characters.find(character => character.id === 'queen');
  expect(queen).not.toBeNull();

  const westHall = findRoom(level.rooms, 'West Hall');
  const foyer = findRoom(level.rooms, 'Foyer');
  const library = findRoom(level.rooms, 'Library');
  const westHallToFoyerExit = westHall.exits.find(exit => exit.room1Id === 'foyer' || exit.room2Id === 'foyer');
  const foyerToLibraryExit = foyer.exits.find(exit => exit.room1Id === 'library' || exit.room2Id === 'library');
  expect(westHallToFoyerExit).not.toBeUndefined();
  expect(foyerToLibraryExit).not.toBeUndefined();

  const westHallExitWaypoint = findExitWaypoint('West Hall', westHall.rect, westHallToFoyerExit!, westHall.waypoints);
  const foyerFromWestHallExitWaypoint = findExitWaypoint('Foyer', foyer.rect, westHallToFoyerExit!, foyer.waypoints);
  const foyerToLibraryExitWaypoint = findExitWaypoint('Foyer', foyer.rect, foyerToLibraryExit!, foyer.waypoints);
  const libraryExitWaypoint = findExitWaypoint('Library', library.rect, foyerToLibraryExit!, library.waypoints);

  const foyerEntryEventIndex = queen!.itinerary.findIndex(event => event.type === ItineraryEventType.ROOM_ENTRY
    && (event as RoomEntryEvent).roomId === 'foyer');
  expect(foyerEntryEventIndex).toBeGreaterThanOrEqual(0);

  const preFoyerWalkEvent = _findPreviousEvent<WalkEvent>(queen!.itinerary, foyerEntryEventIndex,
    event => (event as WalkEvent).type === ItineraryEventType.WALK);
  expect(preFoyerWalkEvent?.type).toBe(ItineraryEventType.WALK);
  expect(_positionsEqual(preFoyerWalkEvent!.toPosition, westHallExitWaypoint.position)
    || _positionsEqual(preFoyerWalkEvent!.toPosition, foyerFromWestHallExitWaypoint.position)).toBe(true);

  const crossToFoyerEvent = queen!.itinerary[foyerEntryEventIndex - 1] as WalkEvent | RoomEntryEvent | undefined;
  if (crossToFoyerEvent?.type === ItineraryEventType.WALK) {
    const isExplicitCrossToFoyer = (_positionsEqual((crossToFoyerEvent as WalkEvent).fromPosition, westHallExitWaypoint.position)
      || _positionsEqual((crossToFoyerEvent as WalkEvent).fromPosition, { x:westHallToFoyerExit!.x, y:westHallToFoyerExit!.y }))
      && _positionsEqual((crossToFoyerEvent as WalkEvent).toPosition, foyerFromWestHallExitWaypoint.position);
    if (isExplicitCrossToFoyer) {
      expect(_positionsEqual((crossToFoyerEvent as WalkEvent).toPosition, foyerFromWestHallExitWaypoint.position)).toBe(true);
    } else {
      expect(_positionsEqual((crossToFoyerEvent as WalkEvent).toPosition, westHallExitWaypoint.position)).toBe(true);
      expect(_positionsEqual(westHallExitWaypoint.position, foyerFromWestHallExitWaypoint.position)).toBe(true);
    }
  } else {
    expect(_positionsEqual(westHallExitWaypoint.position, foyerFromWestHallExitWaypoint.position)).toBe(true);
  }

  const foyerEntryEvent = queen!.itinerary[foyerEntryEventIndex] as RoomEntryEvent;
  expect(foyerEntryEvent?.type).toBe(ItineraryEventType.ROOM_ENTRY);
  expect(foyerEntryEvent?.roomId).toBe('foyer');

  const libraryEntryEventIndex = queen!.itinerary.findIndex((event, index) => index > foyerEntryEventIndex
    && event.type === ItineraryEventType.ROOM_ENTRY
    && (event as RoomEntryEvent).roomId === 'library');
  expect(libraryEntryEventIndex).toBeGreaterThan(foyerEntryEventIndex);

  const preLibraryWalkEvent = _findPreviousEvent<WalkEvent>(queen!.itinerary, libraryEntryEventIndex,
    event => (event as WalkEvent).type === ItineraryEventType.WALK);
  expect(preLibraryWalkEvent?.type).toBe(ItineraryEventType.WALK);
  expect(_positionsEqual(preLibraryWalkEvent!.toPosition, foyerToLibraryExitWaypoint.position)
    || _positionsEqual(preLibraryWalkEvent!.toPosition, libraryExitWaypoint.position)).toBe(true);

  const crossToLibraryEvent = queen!.itinerary[libraryEntryEventIndex - 1] as WalkEvent | RoomEntryEvent | undefined;
  if (crossToLibraryEvent?.type === ItineraryEventType.WALK) {
    const isExplicitCrossToLibrary = (_positionsEqual((crossToLibraryEvent as WalkEvent).fromPosition, foyerToLibraryExitWaypoint.position)
      || _positionsEqual((crossToLibraryEvent as WalkEvent).fromPosition, { x:foyerToLibraryExit!.x, y:foyerToLibraryExit!.y }))
      && _positionsEqual((crossToLibraryEvent as WalkEvent).toPosition, libraryExitWaypoint.position);
    if (isExplicitCrossToLibrary) {
      expect(_positionsEqual((crossToLibraryEvent as WalkEvent).toPosition, libraryExitWaypoint.position)).toBe(true);
    } else {
      expect(_positionsEqual((crossToLibraryEvent as WalkEvent).toPosition, foyerToLibraryExitWaypoint.position)).toBe(true);
      expect(_positionsEqual(foyerToLibraryExitWaypoint.position, libraryExitWaypoint.position)).toBe(true);
    }
  } else {
    expect(_positionsEqual(foyerToLibraryExitWaypoint.position, libraryExitWaypoint.position)).toBe(true);
  }

  const libraryEntryEvent = queen!.itinerary[libraryEntryEventIndex] as RoomEntryEvent;
  expect(libraryEntryEvent?.type).toBe(ItineraryEventType.ROOM_ENTRY);
  expect(libraryEntryEvent?.roomId).toBe('library');
}

describe('at room integration', () => {
  beforeEach(() => {
    setSeed(1);
  });

  afterEach(() => {
    clearSeed();
  });

  it('routes through paired exit waypoints when moving between rooms', () => {
    _expectRoutesThroughPairedExitWaypoints(atLibraryViaFoyerText);
  });

  it('routes @ Room.0% to the unclaimed floor waypoint nearest the authored room percent', () => {
    const level = loadLevelFromText(atRoomMarkerText);
    const king = level.characters.find(character => character.id === 'king');
    const library = findRoom(level.rooms, 'Library');
    const targetWaypoint = _findLeftmostMiddleFloorWaypoint(library);

    expect(king).not.toBeNull();
    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 10_000).position).toEqual(targetWaypoint!.position);
  });

  it('moves within the same room for @ Room.0%', () => {
    const level = loadLevelFromText(atRoomMarkerSameRoomText);
    const king = level.characters.find(character => character.id === 'king');
    const library = findRoom(level.rooms, 'Library');
    const targetWaypoint = _findLeftmostMiddleFloorWaypoint(library);

    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 10_000).position).toEqual(targetWaypoint!.position);
  });

  it('moves within the same room for @ 0%', () => {
    const level = loadLevelFromText(atRoomMarkerSameRoomText.replace('@ Library.0%', '@ 0%'));
    const king = level.characters.find(character => character.id === 'king');
    const library = findRoom(level.rooms, 'Library');
    const targetWaypoint = _findLeftmostMiddleFloorWaypoint(library);

    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 10_000).position).toEqual(targetWaypoint!.position);
  });

  it('routes @ Room.90% to the next-closest interior floor waypoint when the nearest interior floor waypoint is occupied', () => {
    const level = loadLevelFromText(atRoomPercentClaimedInteriorText);
    const scout = level.characters.find(character => character.id === 'scout');
    const target = findRoom(level.rooms, 'Target');
    const tailExit = target.exits.find(exit => exit.room1Id === 'tail' || exit.room2Id === 'tail');
    const targetExitWaypoint = findExitWaypoint(target.id, target.rect, tailExit!, target.waypoints);
    const interiorWaypoints = _findInteriorMiddleFloorWaypointsByDescendingX(target);
    const occupiedWaypointKeys = new Set([_createWaypointKey(interiorWaypoints[0].position)]);
    const events = planMovementToRoom(level, scout!.waypoint, target.id, occupiedWaypointKeys, null, 90);
    const lastWalkEvent = _findLastWalkEvent(events);

    expect(scout).not.toBeNull();
    expect(tailExit).toBeDefined();
    expect(interiorWaypoints.length).toBeGreaterThanOrEqual(2);
    expect(lastWalkEvent).toBeDefined();
    expect(lastWalkEvent!.toPosition).not.toEqual(targetExitWaypoint.position);
    expect(lastWalkEvent!.toPosition).toEqual(interiorWaypoints[1].position);
  });

  it('prefers a middle-row floor waypoint for default @ Room movement in a stair room', () => {
    const level = loadLevelFromText(atRoomDefaultStairRoomText);
    const simon = level.characters.find(character => character.id === 'simon');
    const greatHall = findRoom(level.rooms, 'Great Hall');
    const targetWaypoint = _findMiddleFloorWaypointNearestRoomCenter(greatHall);
    const directEvents = planMovementToRoom(level, simon!.waypoint, 'Great Hall');
    const directLastWalkEvent = _findLastWalkEvent(directEvents);
    const sanctumEvents = planMovementToRoom(level, simon!.waypoint, 'Sanctum');
    const sanctumLastWalkEvent = _findLastWalkEvent(sanctumEvents);
    const sanctum = findRoom(level.rooms, 'Sanctum');
    const sanctumFinalWaypoint = findNearestWaypointToPosition(sanctum, sanctumLastWalkEvent!.toPosition);
    const greatHallFromSanctumEvents = planMovementToRoom(level, sanctumFinalWaypoint, 'Great Hall');
    const greatHallFromSanctumLastWalkEvent = _findLastWalkEvent(greatHallFromSanctumEvents);
    expect(simon).not.toBeNull();
    expect(targetWaypoint).not.toBeNull();
    expect(directLastWalkEvent).toBeDefined();
    expect(sanctumLastWalkEvent).toBeDefined();
    expect(greatHallFromSanctumLastWalkEvent).toBeDefined();
    expect(directLastWalkEvent!.toPosition).toEqual(targetWaypoint!.position);
    expect(greatHallFromSanctumLastWalkEvent!.toPosition).toEqual(targetWaypoint!.position);
    expect(findCharacterPose(simon!, 100_000).position).toEqual(targetWaypoint!.position);
  });

  it('keeps Great Hall room-visit floor movement on the middle row', () => {
    const level = loadLevelFromText(atRoomMiddleRowVisitText);
    const simon = level.characters.find(character => character.id === 'simon');
    const greatHall = findRoom(level.rooms, 'Great Hall');
    const floorY = greatHall.rect.y + greatHall.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
    const greatHallWalkEvents = _findWalkEventsForRoomVisit(simon!.itinerary as (WalkEvent | RoomEntryEvent)[], greatHall.id);

    expect(simon).not.toBeNull();
    expect(greatHallWalkEvents.length).toBeGreaterThan(0);
    expect(greatHallWalkEvents.every(walkEvent => {
      const fromIsFloor = walkEvent.fromPosition.y === floorY;
      const toIsFloor = walkEvent.toPosition.y === floorY;
      return (!fromIsFloor || walkEvent.fromPosition.z === WAYPOINT_MIDDLE_ROW_Z)
        && (!toIsFloor || walkEvent.toPosition.z === WAYPOINT_MIDDLE_ROW_Z);
    })).toBe(true);
  });

  it('starts relative @ Room movement only after the previous file activity completes', () => {
    const level = loadLevelFromText(afterPreviousActivityAtRoomText);
    const king = level.characters.find(character => character.id === 'king');
    const jester = level.characters.find(character => character.id === 'jester');
    const jesterSpeechEvent = jester?.itinerary.find(event => event.type === ItineraryEventType.SPEECH);
    const kingFirstWalkEvent = king?.itinerary.find(event => event.type === ItineraryEventType.WALK) as WalkEvent | undefined;

    expect(jesterSpeechEvent).toBeDefined();
    expect(kingFirstWalkEvent).toBeDefined();
    expect(kingFirstWalkEvent!.startTime).toBeGreaterThanOrEqual(jesterSpeechEvent!.startTime + jesterSpeechEvent!.duration);
  });
});
