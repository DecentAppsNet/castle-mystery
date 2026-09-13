/* This file creates and draws the rotating nimbus shown briefly after a character selection.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { findImageBitmap } from "@/game/imageAssetUtil";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";

export const CHARACTER_SELECTION_NIMBUS_IMAGE_URL = '/assets/sprites/nimbus.png';
const EFFECT_DURATION = 850;
const FADE_IN_DURATION = 200;
const HOLD_DURATION = 300;
const FADE_OUT_DURATION = 350;
const ROTATION_DURATION = 1000;
const HEAD_RADIUS_TO_DIAMETER = 8;

function _calcOpacity(elapsedMetaTime:number):number {
  if (elapsedMetaTime < FADE_IN_DURATION) return clamp(elapsedMetaTime / FADE_IN_DURATION, 0, 1);
  const fadeOutStartTime = FADE_IN_DURATION + HOLD_DURATION;
  if (elapsedMetaTime < fadeOutStartTime) return 1;
  return clamp(1 - (elapsedMetaTime - fadeOutStartTime) / FADE_OUT_DURATION, 0, 1);
}

function _handleCharacterSelectionEffect(startMetaTime:number, drawCall:EffectDrawCall,
    metaTime:number, context:CanvasRenderingContext2D):null {
  if (drawCall.stage !== 'beforeCharacter') return null;
  const nimbusImage = findImageBitmap(drawCall.characterContext.imageSet, CHARACTER_SELECTION_NIMBUS_IMAGE_URL);
  if (!nimbusImage) return null;

  // Calculate presentation from current anatomy and elapsed player-experience time.
  const elapsedMetaTime = metaTime - startMetaTime;
  const { headCenterCanvasPoint:[headCenterX, headCenterY], headRadius } = drawCall.characterContext.characterAnatomy;
  const drawDiameter = headRadius * HEAD_RADIUS_TO_DIAMETER;
  const rotation = elapsedMetaTime / ROTATION_DURATION * Math.PI * 2;

  // Draw the centered nimbus behind the character.
  context.save();
  context.globalAlpha = _calcOpacity(elapsedMetaTime);
  context.translate(headCenterX, headCenterY);
  context.rotate(rotation);
  context.drawImage(nimbusImage, -drawDiameter / 2, -drawDiameter / 2, drawDiameter, drawDiameter);
  context.restore();
  return null;
}

/** Creates a character-selection nimbus beginning at the supplied meta-time. */
export function createCharacterSelectionEffect(metaTime:number):Effect {
  return {
    kind:'characterSelection',
    startTime:metaTime,
    endTime:metaTime + EFFECT_DURATION,
    handler:(drawCall, _scalingFactors:ScalingFactors, _time, currentMetaTime, context) =>
      _handleCharacterSelectionEffect(metaTime, drawCall, currentMetaTime, context)
  };
}
