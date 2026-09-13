/* This file creates and draws short-lived play and pause overlays using meta-time.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp } from "@/common/numberUtil";
import { PAUSE_ICON_TEXT, PLAY_ICON_TEXT } from "@/components/playPauseButton/playPauseText";
import { assert } from "decent-portal";
import { COLOR_BLACK, COLOR_POPOVER_FILL } from "../drawing/drawColorConstants";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";

const PLAY_PAUSE_EFFECT_DURATION = 260;
const START_SCALE = 0.92;
const END_SCALE = 1.08;
const FONT_SIZE_CANVAS_RATIO = 0.22;

function _handlePlayPauseEffect(iconText:string, startTime:number, drawCall:EffectDrawCall,
    scalingFactors:ScalingFactors, metaTime:number, context:CanvasRenderingContext2D):null {
  assert(drawCall.stage === 'afterLevel');

  // Calculate the current animation presentation.
  const progress = clamp((metaTime - startTime) / PLAY_PAUSE_EFFECT_DURATION, 0, 1);
  const scale = START_SCALE + (END_SCALE - START_SCALE) * progress;
  const fontSize = Math.round(Math.min(context.canvas.width, context.canvas.height) * FONT_SIZE_CANVAS_RATIO * scale);
  const x = context.canvas.width / 2;
  const y = context.canvas.height / 2;

  // Draw the centered glyph overlay.
  context.save();
  context.globalAlpha = 1 - progress;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontSize}px Jellee`;
  context.lineJoin = "round";
  context.strokeStyle = COLOR_POPOVER_FILL;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth);
  context.strokeText(iconText, x, y);
  context.fillStyle = COLOR_BLACK;
  context.fillText(iconText, x, y);
  context.restore();
  return null;
}

function _createPlayPauseEffect(kind:'play'|'pause', iconText:string, metaTime:number):Effect {
  return {
    kind,
    startTime:metaTime,
    endTime:metaTime + PLAY_PAUSE_EFFECT_DURATION,
    handler:(drawCall, scalingFactors, _time, currentMetaTime, context) =>
      _handlePlayPauseEffect(iconText, metaTime, drawCall, scalingFactors, currentMetaTime, context)
  };
}

/** Creates a play overlay effect beginning at the given meta-time. */
export function createPlayEffect(metaTime:number):Effect {
  return _createPlayPauseEffect('play', PLAY_ICON_TEXT, metaTime);
}

/** Creates a pause overlay effect beginning at the given meta-time. */
export function createPauseEffect(metaTime:number):Effect {
  return _createPlayPauseEffect('pause', PAUSE_ICON_TEXT, metaTime);
}