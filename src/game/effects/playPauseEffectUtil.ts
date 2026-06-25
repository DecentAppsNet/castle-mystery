/* This module groups play and pause effect creation and drawing helpers for playback status feedback.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { PAUSE_ICON_TEXT, PLAY_ICON_TEXT } from "@/components/playPauseButton/playPauseText";
import { COLOR_BLACK, COLOR_POPOVER_FILL } from "../drawing/drawColorConstants";
import Effect from "./types/Effect";
import PauseEffect from "./types/PauseEffect";
import PlayEffect from "./types/PlayEffect";
import EffectType from "./types/EffectType";

const PLAY_PAUSE_EFFECT_DURATION = 260;
const START_SCALE = 0.92;
const END_SCALE = 1.08;

function _onProcessLevelEffect(effect:Effect, context:CanvasRenderingContext2D):boolean {
  const overlayEffect = effect as PlayEffect|PauseEffect;
  const elapsed = Date.now() - overlayEffect.startTime;
  const progress = clamp(elapsed / PLAY_PAUSE_EFFECT_DURATION, 0, 1);
  const scale = START_SCALE + (END_SCALE - START_SCALE) * progress;
  const alpha = 1 - progress;
  const fontSize = Math.round(Math.min(context.canvas.width, context.canvas.height) * 0.22 * scale);
  const x = context.canvas.width / 2;
  const y = context.canvas.height / 2;
  const iconText = overlayEffect.type === EffectType.PLAY ? PLAY_ICON_TEXT : PAUSE_ICON_TEXT;

  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontSize}px Jellee`;
  context.lineJoin = "round";
  context.strokeStyle = COLOR_POPOVER_FILL;
  context.lineWidth = overlayEffect.outlineWidth;
  context.strokeText(iconText, x, y);
  context.fillStyle = COLOR_BLACK;
  context.fillText(iconText, x, y);
  context.restore();

  return elapsed < PLAY_PAUSE_EFFECT_DURATION;
}

export function createPlayEffect(time:number, outlineWidth:number):PlayEffect {
  return {
    type:EffectType.PLAY,
    startTime:time,
    outlineWidth:Math.max(1, outlineWidth),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}

export function createPauseEffect(time:number, outlineWidth:number):PauseEffect {
  return {
    type:EffectType.PAUSE,
    startTime:time,
    outlineWidth:Math.max(1, outlineWidth),
    onProcessLevelEffect:_onProcessLevelEffect
  };
}