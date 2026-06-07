/* This module groups lock and unlock effect creation and drawing helpers for exit-state animations.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "../drawing/drawUtil";
import ImageSet from "../types/ImageSet";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import LockChangeEffect from "./types/LockChangeEffect";

export const KEY_IMAGE_URL = '/assets/sprites/key.png';
const LOCK_EFFECT_DURATION = 500;

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D,
  scalingFactors:ScalingFactors, canDrawEffect:boolean, _imageSet:ImageSet):boolean {
  const lockEffect = effect as LockChangeEffect;
  const elapsed = Date.now() - lockEffect.startTime;
  if (!canDrawEffect) return elapsed < LOCK_EFFECT_DURATION;
  const progress = clamp(elapsed / LOCK_EFFECT_DURATION, 0, 1);
  const sizePixels = Math.max(12, scalingFactors.roomLineWidth * 4);
  const { drawWidthPixels, drawHeightPixels } = _calcKeyDrawDimensions(sizePixels, lockEffect.image);
  const [exitCanvasX, exitCanvasY] = gameToCanvasPosition(lockEffect.exitX, lockEffect.exitY, scalingFactors);
  const travelYPixels = lockEffect.travelDirection * Math.max(12, scalingFactors.roomLineWidth * 4);
  const x = exitCanvasX - drawWidthPixels / 2;
  const y = exitCanvasY - drawHeightPixels / 2 + progress * travelYPixels;
  context.save();
  context.globalAlpha = 1 - progress;
  if (lockEffect.image) {
    context.drawImage(lockEffect.image, x, y, drawWidthPixels, drawHeightPixels);
  }
  context.restore();
  return elapsed < LOCK_EFFECT_DURATION;
}

function _calcKeyDrawDimensions(sizePixels:number, image:ImageBitmap|null) {
  if (!image?.width || !image.height) return { drawWidthPixels:sizePixels, drawHeightPixels:sizePixels };
  return {
    drawWidthPixels:sizePixels * (image.width / image.height),
    drawHeightPixels:sizePixels
  };
}

function _createLockChangeEffect(type:typeof EffectType.LOCK|typeof EffectType.UNLOCK, room:Room, exit:RoomExit,
  time:number, _scalingFactors:ScalingFactors, imageSet:ImageSet, travelYPixels:number):LockChangeEffect {
  const image = imageSet.get(KEY_IMAGE_URL) || null;
  return {
    type,
    room,
    startTime:time,
    image,
    exitX:exit.x,
    exitY:exit.y,
    travelDirection:Math.sign(travelYPixels) || 1,
    onProcessRoomEffect:_onProcessRoomEffect
  };
}

export function createLockEffect(room:Room, exit:RoomExit, time:number, scalingFactors:ScalingFactors, imageSet:ImageSet):LockChangeEffect {
  return _createLockChangeEffect(EffectType.LOCK, room, exit, time, scalingFactors, imageSet, Math.max(12, scalingFactors.roomLineWidth * 4));
}

export function createUnlockEffect(room:Room, exit:RoomExit, time:number, scalingFactors:ScalingFactors, imageSet:ImageSet):LockChangeEffect {
  return _createLockChangeEffect(EffectType.UNLOCK, room, exit, time, scalingFactors, imageSet, -Math.max(12, scalingFactors.roomLineWidth * 4));
}