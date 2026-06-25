/* This module groups character-selection effect creation and processing helpers for the active-character highlight animation.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { COLOR_CHARACTER_SELECT_EFFECT } from "../drawing/drawColorConstants";
import { projectRoomPointWithDepth } from "../drawing/roomPanelProjectionUtil";
import Character from "../types/Character";
import Position from "../types/Position";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import CharacterSelectEffect from "./types/CharacterSelectEffect";
import EffectType from "./types/EffectType";

const CHARACTER_SELECT_EFFECT_DURATION = 500;
const PARTICLE_SPIN_RADIANS = Math.PI / 8;

function _drawParticle(context:CanvasRenderingContext2D, x:number, y:number, radius:number) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const characterSelectEffect = effect as CharacterSelectEffect;
  const elapsed = Date.now() - characterSelectEffect.startTime;
  const progress = clamp(elapsed / CHARACTER_SELECT_EFFECT_DURATION, 0, 1);
  const [centerX, bottomY] = projectRoomPointWithDepth(
    characterSelectEffect.displayPosition.x,
    characterSelectEffect.displayPosition.y,
    characterSelectEffect.displayPosition.z,
    characterSelectEffect.scalingFactors
  );
  const centerY = bottomY - characterSelectEffect.centerYOffsetPixels;
  const radius = characterSelectEffect.startRadiusPixels
    + (characterSelectEffect.endRadiusPixels - characterSelectEffect.startRadiusPixels) * progress;
  const particleRadius = characterSelectEffect.particleRadiusPixels * (1 - progress * 0.35);
  const rotation = PARTICLE_SPIN_RADIANS * progress;

  context.save();
  context.globalAlpha = 1 - progress;
  context.fillStyle = COLOR_CHARACTER_SELECT_EFFECT;
  for (let particleI = 0; particleI < characterSelectEffect.particleCount; ++particleI) {
    const angle = rotation + particleI * (Math.PI * 2 / characterSelectEffect.particleCount);
    _drawParticle(
      context,
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
      particleRadius
    );
  }
  context.restore();

  return elapsed < CHARACTER_SELECT_EFFECT_DURATION;
}

export function createCharacterSelectEffect(character:Character, displayPosition:Position, time:number, scalingFactors:ScalingFactors):CharacterSelectEffect {
  const characterHeight = scalingFactors.roomLineWidth * 10;
  return {
    type:EffectType.CHARACTER_SELECT,
    character,
    displayPosition:{ ...displayPosition },
    scalingFactors,
    startTime:time,
    startRadiusPixels:Math.max(8, scalingFactors.roomLineWidth * 1.2),
    endRadiusPixels:Math.max(22, scalingFactors.roomLineWidth * 5.5),
    particleRadiusPixels:Math.max(2, scalingFactors.roomLineWidth * 0.7),
    particleCount:10,
    centerYOffsetPixels:characterHeight / 2,
    onProcessLevelEffect:_onProcessLevelEffect
  };
}