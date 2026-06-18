/* This module groups camera creation, targeting, and viewport update helpers for the game scene.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";

import { findRoomAtPosition } from "./roomUtil";
import { calcRenderedRoomBounds, calcRenderedRoomsBoundingRect } from "./roomRoofUtil";
import Camera from "./types/Camera";
import Character from "./types/Character";
import Rect from "./types/Rect";
import Room from "./types/Room";

const CAMERA_MOVE_DURATION_MSECS = 400;
const CAMERA_EPSILON = 0.000001;
const CAMERA_MARGIN_RATIO = 0.05;

function _duplicateRect(rect:Rect):Rect {
  return { ...rect };
}

function _expandRectFromCenter(rect:Rect, marginRatio:number):Rect {
  const width = rect.width * (1 + marginRatio);
  const height = rect.height * (1 + marginRatio);
  return {
    x:rect.x - (width - rect.width) / 2,
    y:rect.y - (height - rect.height) / 2,
    width,
    height
  };
}

function _fitRectToAspectRatio(rect:Rect, aspectRatio:number):Rect {
  if (aspectRatio <= 0) return { ...rect };

  const rectAspectRatio = rect.width / rect.height;
  if (rectAspectRatio >= aspectRatio) {
    const cameraHeight = rect.width / aspectRatio;
    return {
      x:rect.x,
      y:rect.y - (cameraHeight - rect.height) / 2,
      width:rect.width,
      height:cameraHeight
    };
  }

  const cameraWidth = rect.height * aspectRatio;
  return {
    x:rect.x - (cameraWidth - rect.width) / 2,
    y:rect.y,
    width:cameraWidth,
    height:rect.height
  };
}

function _rectsMatch(rect1:Rect, rect2:Rect):boolean {
  return Math.abs(rect1.x - rect2.x) <= CAMERA_EPSILON
    && Math.abs(rect1.y - rect2.y) <= CAMERA_EPSILON
    && Math.abs(rect1.width - rect2.width) <= CAMERA_EPSILON
    && Math.abs(rect1.height - rect2.height) <= CAMERA_EPSILON;
}

function _interpolate(from:number, to:number, amount:number):number {
  return from + (to - from) * amount;
}

function _interpolateRect(fromRect:Rect, toRect:Rect, amount:number):Rect {
  return {
    x:_interpolate(fromRect.x, toRect.x, amount),
    y:_interpolate(fromRect.y, toRect.y, amount),
    width:_interpolate(fromRect.width, toRect.width, amount),
    height:_interpolate(fromRect.height, toRect.height, amount)
  };
}

function _easeInOutCubic(amount:number):number {
  return amount < 0.5
    ? 4 * amount * amount * amount
    : 1 - Math.pow(-2 * amount + 2, 3) / 2;
}

export function calcCanvasAspectRatio(context:CanvasRenderingContext2D):number {
  return context.canvas.height > 0 ? context.canvas.width / context.canvas.height : 1;
}

export function createCamera(initialRect:Rect):Camera {
  return {
    currentRect:_duplicateRect(initialRect),
    targetRect:_duplicateRect(initialRect),
    startRect:_duplicateRect(initialRect),
    currentZoomAmount:1,
    startZoomAmount:1,
    trackedRoomId:null,
    aspectRatio:NaN,
    zoomAmount:1,
    moveStartTime:0,
    moveDuration:0,
    isMoving:false
  };
}

export function calcRoomCameraRect(room:Room, rooms:ReadonlyArray<Room>, aspectRatio:number, groundFloorY:number = Infinity):Rect {
  return _expandRectFromCenter(_fitRectToAspectRatio(calcRenderedRoomBounds(room, rooms, groundFloorY), aspectRatio), CAMERA_MARGIN_RATIO);
}

export function calcLevelCameraRect(rooms:Room[], aspectRatio:number, groundFloorY:number = Infinity):Rect {
  return _fitRectToAspectRatio(calcRenderedRoomsBoundingRect(rooms, groundFloorY), aspectRatio);
}

function _findTargetCameraRect(rooms:Room[], activeCharacter:Character|null, aspectRatio:number,
  zoomAmount:number, groundFloorY:number):{ roomId:string|null, rect:Rect } {
  const levelCameraRect = calcLevelCameraRect(rooms, aspectRatio, groundFloorY);
  const activeRoom = activeCharacter ? findRoomAtPosition(rooms, activeCharacter.position.x, activeCharacter.position.y) : null;
  const focusedRect = activeRoom ? calcRoomCameraRect(activeRoom, rooms, aspectRatio, groundFloorY) : levelCameraRect;
  return {
    roomId:activeRoom?.id || null,
    rect:_interpolateRect(levelCameraRect, focusedRect, clamp(zoomAmount, 0, 1))
  };
}

export function syncCameraTargetToActiveRoom(camera:Camera, rooms:Room[], activeCharacter:Character|null,
  aspectRatio:number, now:number, groundFloorY:number = Infinity) {
  const target = _findTargetCameraRect(rooms, activeCharacter, aspectRatio, camera.zoomAmount, groundFloorY);
  if (camera.trackedRoomId === target.roomId
    && Math.abs(camera.aspectRatio - aspectRatio) <= CAMERA_EPSILON
    && _rectsMatch(camera.targetRect, target.rect)) return;

  camera.startRect = _duplicateRect(camera.currentRect);
  camera.startZoomAmount = camera.currentZoomAmount;
  camera.targetRect = _duplicateRect(target.rect);
  camera.trackedRoomId = target.roomId;
  camera.aspectRatio = aspectRatio;
  camera.moveStartTime = now;
  camera.moveDuration = CAMERA_MOVE_DURATION_MSECS;
  camera.isMoving = !_rectsMatch(camera.currentRect, camera.targetRect);
  if (!camera.isMoving) {
    camera.currentRect = _duplicateRect(camera.targetRect);
    camera.currentZoomAmount = camera.zoomAmount;
  }
}

export function updateCamera(camera:Camera, now:number) {
  if (!camera.isMoving) return;
  if (camera.moveDuration <= 0 || now >= camera.moveStartTime + camera.moveDuration) {
    camera.currentRect = _duplicateRect(camera.targetRect);
    camera.startRect = _duplicateRect(camera.targetRect);
    camera.currentZoomAmount = camera.zoomAmount;
    camera.startZoomAmount = camera.zoomAmount;
    camera.isMoving = false;
    return;
  }

  const amount = clamp((now - camera.moveStartTime) / camera.moveDuration, 0, 1);
  const easedAmount = _easeInOutCubic(amount);
  camera.currentRect = _interpolateRect(camera.startRect, camera.targetRect, easedAmount);
  camera.currentZoomAmount = _interpolate(camera.startZoomAmount, camera.zoomAmount, easedAmount);
}