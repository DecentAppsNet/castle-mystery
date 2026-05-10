import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearSeed, setSeed } from '@/common/randUtil';
import { loadLevelFromText } from '../levelUtil';
import { findExitWaypoint, findRoom } from '../roomUtil';
import ItineraryEventType from '../types/itineraryEvents/ItineraryEventType';
import WalkEvent from '../types/itineraryEvents/WalkEvent';
import RoomEntryEvent from '../types/itineraryEvents/RoomEntryEvent';
import atLibraryViaFoyerText from './fixtures/at-library-via-foyer.md?raw';
import wanderThenLibraryLShapeText from './fixtures/wander-then-library-l-shape.md?raw';
import wanderThenLibraryWithSanctumText from './fixtures/wander-then-library-with-sanctum.md?raw';
import wanderThenLibraryViaFoyerText from './fixtures/wander-then-library-via-foyer.md?raw';

function _positionsEqual(position1:{ x:number, y:number }, position2:{ x:number, y:number }) {
  return position1.x === position2.x && position1.y === position2.y;
}

function _expectRoutesThroughPairedExitWaypoints(levelText:string) {
  const level = loadLevelFromText(levelText);
  const queen = level.characters.find(character => character.id === 'Queen');
  expect(queen).not.toBeNull();

  const westHall = findRoom(level.rooms, 'West Hall');
  const foyer = findRoom(level.rooms, 'Foyer');
  const library = findRoom(level.rooms, 'Library');
  const westHallToFoyerExit = westHall.exits.find(exit => exit.room1Id === 'Foyer' || exit.room2Id === 'Foyer');
  const foyerToLibraryExit = foyer.exits.find(exit => exit.room1Id === 'Library' || exit.room2Id === 'Library');
  expect(westHallToFoyerExit).not.toBeUndefined();
  expect(foyerToLibraryExit).not.toBeUndefined();

  const westHallExitWaypoint = findExitWaypoint('West Hall', westHall.rect, westHallToFoyerExit!, westHall.waypoints);
  const foyerFromWestHallExitWaypoint = findExitWaypoint('Foyer', foyer.rect, westHallToFoyerExit!, foyer.waypoints);
  const foyerToLibraryExitWaypoint = findExitWaypoint('Foyer', foyer.rect, foyerToLibraryExit!, foyer.waypoints);
  const libraryExitWaypoint = findExitWaypoint('Library', library.rect, foyerToLibraryExit!, library.waypoints);

  const westHallExitWaypointIndex = queen!.itinerary.findIndex(event => event.type === ItineraryEventType.WALK
    && _positionsEqual((event as WalkEvent).toPosition, westHallExitWaypoint.position));
  expect(westHallExitWaypointIndex).toBeGreaterThanOrEqual(0);

  const crossToFoyerEvent = queen!.itinerary[westHallExitWaypointIndex + 1] as WalkEvent | undefined;
  expect(crossToFoyerEvent?.type).toBe(ItineraryEventType.WALK);
  expect(_positionsEqual(crossToFoyerEvent!.fromPosition, westHallExitWaypoint.position)).toBe(true);
  expect(_positionsEqual(crossToFoyerEvent!.toPosition, foyerFromWestHallExitWaypoint.position)).toBe(true);

  const foyerEntryEvent = queen!.itinerary[westHallExitWaypointIndex + 2] as RoomEntryEvent | undefined;
  expect(foyerEntryEvent?.type).toBe(ItineraryEventType.ROOM_ENTRY);
  expect(foyerEntryEvent?.roomId).toBe('Foyer');

  const foyerToLibraryExitWaypointIndex = queen!.itinerary.findIndex(event => event.type === ItineraryEventType.WALK
    && _positionsEqual((event as WalkEvent).toPosition, foyerToLibraryExitWaypoint.position));
  expect(foyerToLibraryExitWaypointIndex).toBeGreaterThan(westHallExitWaypointIndex);

  const crossToLibraryEvent = queen!.itinerary[foyerToLibraryExitWaypointIndex + 1] as WalkEvent | undefined;
  expect(crossToLibraryEvent?.type).toBe(ItineraryEventType.WALK);
  expect(_positionsEqual(crossToLibraryEvent!.fromPosition, foyerToLibraryExitWaypoint.position)).toBe(true);
  expect(_positionsEqual(crossToLibraryEvent!.toPosition, libraryExitWaypoint.position)).toBe(true);

  const libraryEntryEvent = queen!.itinerary[foyerToLibraryExitWaypointIndex + 2] as RoomEntryEvent | undefined;
  expect(libraryEntryEvent?.type).toBe(ItineraryEventType.ROOM_ENTRY);
  expect(libraryEntryEvent?.roomId).toBe('Library');
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

  it('routes through paired exit waypoints after a wander before room navigation', () => {
    _expectRoutesThroughPairedExitWaypoints(wanderThenLibraryViaFoyerText);
  });

  it('routes through paired exit waypoints after a wander when the starting room has another exit', () => {
    _expectRoutesThroughPairedExitWaypoints(wanderThenLibraryWithSanctumText);
  });

  it('routes through paired exit waypoints in the L-shaped west-hall layout from kingacide', () => {
    _expectRoutesThroughPairedExitWaypoints(wanderThenLibraryLShapeText);
  });
});
