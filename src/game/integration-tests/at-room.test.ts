// Follow test conventions from CONTRIBUTING.md when editing this file.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '@/levelLoading/levelUtil';
import { findCharacterPose } from '../itineraryUtil';
import { findExitWaypoint, findRoom, FLOOR_WAYPOINT_Y_OFFSET } from '../roomUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import WalkEvent from '../types/itineraryEvents/WalkEvent';
import RoomEntryEvent from '../types/itineraryEvents/RoomEntryEvent';
import afterPreviousActivityAtRoomText from './fixtures/after-previous-activity-at-room.md?raw';
import atRoomMarkerSameRoomText from './fixtures/at-room-marker-same-room.md?raw';
import atRoomMarkerText from './fixtures/at-room-marker.md?raw';
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
    const floorY = library.rect.y + library.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
    const targetWaypoint = library.waypoints.reduce((leftmostFloorWaypoint, waypoint) => {
      if (waypoint.position.y !== floorY) return leftmostFloorWaypoint;
      if (!leftmostFloorWaypoint) return waypoint;
      return waypoint.position.x < leftmostFloorWaypoint.position.x ? waypoint : leftmostFloorWaypoint;
    }, null as typeof library.waypoints[number] | null);

    expect(king).not.toBeNull();
    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 10_000).position).toEqual(targetWaypoint!.position);
  });

  it('moves within the same room for @ Room.0%', () => {
    const level = loadLevelFromText(atRoomMarkerSameRoomText);
    const king = level.characters.find(character => character.id === 'king');
    const library = findRoom(level.rooms, 'Library');
    const floorY = library.rect.y + library.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
    const targetWaypoint = library.waypoints.reduce((leftmostFloorWaypoint, waypoint) => {
      if (waypoint.position.y !== floorY) return leftmostFloorWaypoint;
      if (!leftmostFloorWaypoint) return waypoint;
      return waypoint.position.x < leftmostFloorWaypoint.position.x ? waypoint : leftmostFloorWaypoint;
    }, null as typeof library.waypoints[number] | null);

    expect(targetWaypoint).not.toBeNull();
    expect(findCharacterPose(king!, 10_000).position).toEqual(targetWaypoint!.position);
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
