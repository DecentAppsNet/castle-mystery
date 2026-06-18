// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { calcRoomCameraRect, createCamera, syncCameraTargetToActiveRoom, updateCamera } from '../cameraUtil';
import { calcRenderedRoomBounds, calcRenderedRoomsBoundingRect } from '../roomRoofUtil';
import { ROOM_BACK_Z, ROOM_MIDDLE_ROW_CENTER_Z } from '../roomSpaceConstants';
import Character, { createDefaultCharacter } from '../types/Character';
import Rect from '../types/Rect';
import Room, { createDefaultRoom } from '../types/Room';
import Waypoint from '../types/Waypoint';

const FLOAT_EPSILON = 0.000001;
const BACK_ROW_Z = ROOM_BACK_Z;
const DEFAULT_CHARACTER_DEPTH = ROOM_MIDDLE_ROW_CENTER_Z;

function _createRoom(rect:Room['rect']):Room {
  return {
    ...createDefaultRoom(),
    rect
  };
}

function _createCharacter(x:number, y:number):Character {
  const waypoint:Waypoint = { position:{ x, y, z:BACK_ROW_Z }, adjacentWaypoints:[], exitDirections:{} };
  return {
    ...createDefaultCharacter(),
    id:'hero',
    title:'Hero',
    description:'Hero',
    position:{ x, y, z:DEFAULT_CHARACTER_DEPTH },
    waypoint
  };
}

function _expectRectToContainRect(outerRect:Rect, innerRect:Rect) {
  expect(outerRect.x).toBeLessThanOrEqual(innerRect.x);
  expect(outerRect.y).toBeLessThanOrEqual(innerRect.y);
  expect(outerRect.x + outerRect.width).toBeGreaterThanOrEqual(innerRect.x + innerRect.width);
  expect(outerRect.y + outerRect.height).toBeGreaterThanOrEqual(innerRect.y + innerRect.height);
}

function _expectRectToBeCenteredOnRect(rect:Rect, centeredRect:Rect) {
  expect(rect.x + rect.width / 2).toBeCloseTo(centeredRect.x + centeredRect.width / 2, 6);
  expect(rect.y + rect.height / 2).toBeCloseTo(centeredRect.y + centeredRect.height / 2, 6);
}

function _expectRectToMatchAspectRatio(rect:Rect, aspectRatio:number) {
  expect(rect.width / rect.height).toBeCloseTo(aspectRatio, 6);
}

function _expectNumberToBeBetween(value:number, bound1:number, bound2:number) {
  expect(value).toBeGreaterThanOrEqual(Math.min(bound1, bound2) - FLOAT_EPSILON);
  expect(value).toBeLessThanOrEqual(Math.max(bound1, bound2) + FLOAT_EPSILON);
}

describe('cameraUtil', () => {
  describe('calcRoomCameraRect()', () => {
    it('returns an aspect-correct rect that fully contains and stays centered on a wide room', () => {
      const room = _createRoom({ x:10, y:20, width:40, height:20 });
      const renderedBounds = calcRenderedRoomBounds(room, [room]);
      const cameraRect = calcRoomCameraRect(room, [room], 1);

      _expectRectToMatchAspectRatio(cameraRect, 1);
      _expectRectToContainRect(cameraRect, renderedBounds);
      _expectRectToBeCenteredOnRect(cameraRect, renderedBounds);
    });

    it('returns an aspect-correct rect that fully contains and stays centered on a tall room', () => {
      const room = _createRoom({ x:10, y:20, width:20, height:40 });
      const renderedBounds = calcRenderedRoomBounds(room, [room]);
      const cameraRect = calcRoomCameraRect(room, [room], 2);

      _expectRectToMatchAspectRatio(cameraRect, 2);
      _expectRectToContainRect(cameraRect, renderedBounds);
      _expectRectToBeCenteredOnRect(cameraRect, renderedBounds);
    });
  });

  describe('syncCameraTargetToActiveRoom()', () => {
    it('targets the active room with an aspect-correct rect without moving the camera immediately', () => {
      const room = _createRoom({ x:10, y:20, width:40, height:20 });
      const renderedBounds = calcRenderedRoomBounds(room, [room]);
      const camera = createCamera({ x:0, y:0, width:100, height:100 });
      camera.zoomAmount = 1;
      const originalRect = { ...camera.currentRect };

      syncCameraTargetToActiveRoom(camera, [room], _createCharacter(20, 30), 1, 1_000);

      expect(camera.trackedRoomId).toBe('room');
      expect(camera.aspectRatio).toBe(1);
      expect(camera.startRect).toEqual(originalRect);
      expect(camera.currentRect).toEqual(originalRect);
      _expectRectToMatchAspectRatio(camera.targetRect, 1);
      _expectRectToContainRect(camera.targetRect, renderedBounds);
      _expectRectToBeCenteredOnRect(camera.targetRect, renderedBounds);
      expect(camera.isMoving).toBe(true);
    });

    it('uses zoomAmount 0 for a full-level view and zoomAmount 1 for the focused room view', () => {
      const room = _createRoom({ x:10, y:20, width:40, height:20 });
      const farRoom = _createRoom({ x:150, y:20, width:30, height:30 });
      const rooms = [room, farRoom];
      const camera = createCamera({ x:0, y:0, width:100, height:100 });

      camera.zoomAmount = 0;
      syncCameraTargetToActiveRoom(camera, rooms, _createCharacter(20, 30), 1, 1_000);
      const zoomedOutRect = { ...camera.targetRect };

      camera.zoomAmount = 1;
      syncCameraTargetToActiveRoom(camera, rooms, _createCharacter(20, 30), 1, 1_001);
      const zoomedInRect = { ...camera.targetRect };

      _expectRectToContainRect(zoomedOutRect, calcRenderedRoomsBoundingRect(rooms));
      _expectRectToContainRect(zoomedInRect, calcRenderedRoomBounds(room, rooms));
      expect(zoomedOutRect.width).toBeGreaterThan(zoomedInRect.width);
      expect(zoomedOutRect.height).toBeGreaterThan(zoomedInRect.height);
    });
  });

  describe('updateCamera()', () => {
    it('moves the current rect from the start rect to the target rect over the configured duration', () => {
      const room = _createRoom({ x:10, y:20, width:40, height:20 });
      const camera = createCamera({ x:0, y:0, width:100, height:100 });
      camera.zoomAmount = 1;
      syncCameraTargetToActiveRoom(camera, [room], _createCharacter(20, 30), 1, 1_000);
      const startRect = { ...camera.currentRect };
      const halfwayTime = camera.moveStartTime + camera.moveDuration / 2;

      updateCamera(camera, halfwayTime);
      expect(camera.currentRect).not.toEqual(startRect);
      expect(camera.currentRect).not.toEqual(camera.targetRect);
      _expectNumberToBeBetween(camera.currentRect.x, startRect.x, camera.targetRect.x);
      _expectNumberToBeBetween(camera.currentRect.y, startRect.y, camera.targetRect.y);
      _expectNumberToBeBetween(camera.currentRect.width, startRect.width, camera.targetRect.width);
      _expectNumberToBeBetween(camera.currentRect.height, startRect.height, camera.targetRect.height);
      _expectNumberToBeBetween(camera.currentZoomAmount, 0, camera.zoomAmount);
      expect(camera.isMoving).toBe(true);

      updateCamera(camera, camera.moveStartTime + camera.moveDuration);
      expect(camera.currentRect).toEqual(camera.targetRect);
      expect(camera.currentZoomAmount).toBe(camera.zoomAmount);
      expect(camera.isMoving).toBe(false);
    });
  });
});