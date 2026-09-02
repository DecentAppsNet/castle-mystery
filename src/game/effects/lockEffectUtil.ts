/* This file creates and draws key-sprite animations for room-exit lock and unlock effects.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "@/game/drawing/drawUtil";
import { findImageBitmap } from "@/game/imageAssetUtil";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import EffectHandler from "./types/EffectHandler";

export const KEY_IMAGE_URL = '/assets/sprites/key.png';
const LOCK_UNLOCK_DURATION = 500;

function _drawLockChange(drawCall:EffectDrawCall, scalingFactors:ScalingFactors, time:number,
    context:CanvasRenderingContext2D, exitPosition:Position, startTime:number, travelDirection:1|-1):null {
  if (drawCall.stage !== 'afterCharacter') return null;
  const image = findImageBitmap(drawCall.characterContext.itemTransfer.imageSet, KEY_IMAGE_URL);
  if (!image) return null;

  // Calculate the current canvas geometry from the timeline progress and scaling.
  const progress = clamp((time - startTime) / LOCK_UNLOCK_DURATION, 0, 1);
  const drawHeight = Math.max(12, scalingFactors.roomLineWidth * 4);
  const drawWidth = drawHeight * image.width / image.height;
  const [exitCanvasX, exitCanvasY] = gameToCanvasPosition(exitPosition.x, exitPosition.y, scalingFactors);
  const drawX = exitCanvasX - drawWidth / 2;
  const drawY = exitCanvasY - drawHeight / 2 + progress * drawHeight * travelDirection;

  // Fade and draw the key over the character-room pass.
  context.save();
  context.globalAlpha = 1 - progress;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
  return null;
}

function _createLockChangeEffect(kind:'lockExit'|'unlockExit', exitPosition:Position, startTime:number,
    travelDirection:1|-1):Effect {
  const handler:EffectHandler = (drawCall, scalingFactors, time, _metaTime, context) =>
    _drawLockChange(drawCall, scalingFactors, time, context, exitPosition, startTime, travelDirection);
  return { kind, startTime, endTime:startTime + LOCK_UNLOCK_DURATION, handler };
}

export function createLockEffect(exitPosition:Position, startTime:number):Effect {
  return _createLockChangeEffect('lockExit', exitPosition, startTime, 1);
}

export function createUnlockEffect(exitPosition:Position, startTime:number):Effect {
  return _createLockChangeEffect('unlockExit', exitPosition, startTime, -1);
}
