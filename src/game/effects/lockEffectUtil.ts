import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "../drawing/drawUtil";
import ImageSet from "../types/ImageSet";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import LockChangeEffect from "./types/LockChangeEffect";

export const KEY_IMAGE_URL = '/sprites/key.png';
const LOCK_EFFECT_DURATION = 500;

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean):boolean {
  const lockEffect = effect as LockChangeEffect;
  const elapsed = Date.now() - lockEffect.startTime;
  if (!isActive) return elapsed < LOCK_EFFECT_DURATION;
  const progress = clamp(elapsed / LOCK_EFFECT_DURATION, 0, 1);
  const y = lockEffect.startCanvasY + progress * lockEffect.travelYPixels;
  context.save();
  context.globalAlpha = 1 - progress;
  if (lockEffect.image) {
    context.drawImage(lockEffect.image, lockEffect.startCanvasX, y, lockEffect.drawWidthPixels, lockEffect.drawHeightPixels);
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
  time:number, scalingFactors:ScalingFactors, imageSet:ImageSet, travelYPixels:number):LockChangeEffect {
  const sizePixels = Math.max(12, scalingFactors.roomLineWidth * 4);
  const image = imageSet.get(KEY_IMAGE_URL) || null;
  const { drawWidthPixels, drawHeightPixels } = _calcKeyDrawDimensions(sizePixels, image);
  const [exitCanvasX, exitCanvasY] = gameToCanvasPosition(exit.x, exit.y, scalingFactors);
  return {
    type,
    room,
    startTime:time,
    image,
    startCanvasX:exitCanvasX - drawWidthPixels / 2,
    startCanvasY:exitCanvasY - drawHeightPixels / 2,
    drawWidthPixels,
    drawHeightPixels,
    offsetXPixels:0,
    travelYPixels,
    onProcessRoomEffect:_onProcessRoomEffect
  };
}

export function createLockEffect(room:Room, exit:RoomExit, time:number, scalingFactors:ScalingFactors, imageSet:ImageSet):LockChangeEffect {
  return _createLockChangeEffect(EffectType.LOCK, room, exit, time, scalingFactors, imageSet, Math.max(12, scalingFactors.roomLineWidth * 4));
}

export function createUnlockEffect(room:Room, exit:RoomExit, time:number, scalingFactors:ScalingFactors, imageSet:ImageSet):LockChangeEffect {
  return _createLockChangeEffect(EffectType.UNLOCK, room, exit, time, scalingFactors, imageSet, -Math.max(12, scalingFactors.roomLineWidth * 4));
}