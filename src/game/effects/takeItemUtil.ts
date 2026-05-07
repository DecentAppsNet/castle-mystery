import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "../drawUtil";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_ITEM_TEXT } from "../drawConstants";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import TakeItemEffect from "./types/TakeItemEffect";

const TAKE_ITEM_EFFECT_DURATION = 500;

function _getItemGlyphFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(10, Math.round(scalingFactors.roomFontHeight * 0.75));
}

function _getItemLabelFontSize(scalingFactors:ScalingFactors):number {
  return Math.max(7, Math.round(scalingFactors.roomFontHeight * 0.55));
}

function _drawAnimatedItem(takeItemEffect:TakeItemEffect, context:CanvasRenderingContext2D, progress:number) {
  const y = takeItemEffect.startCanvasY - progress * takeItemEffect.riseDistancePixels;
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = COLOR_ITEM_TEXT;
  context.font = `${takeItemEffect.glyphFontSize}px Jellee`;
  context.fillText(takeItemEffect.item.displayChar, takeItemEffect.startCanvasX, y);
  context.font = `${takeItemEffect.labelFontSize}px Jellee`;
  context.fillText(takeItemEffect.item.title, takeItemEffect.startCanvasX, y + takeItemEffect.labelOffsetY);
  context.restore();
}

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D):boolean {
  const takeItemEffect = effect as TakeItemEffect;
  const elapsed = Date.now() - takeItemEffect.startTime;
  const progress = clamp(elapsed / TAKE_ITEM_EFFECT_DURATION, 0, 1);
  _drawAnimatedItem(takeItemEffect, context, progress);
  return elapsed < TAKE_ITEM_EFFECT_DURATION;
}

export function createTakeItemEffect(item:Item, room:Room, time:number, scalingFactors:ScalingFactors):TakeItemEffect {
  const [startCanvasX, startCanvasY] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  const glyphFontSize = _getItemGlyphFontSize(scalingFactors);
  const labelFontSize = _getItemLabelFontSize(scalingFactors);
  return {
    type:EffectType.TAKE_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasX,
    startCanvasY,
    glyphFontSize,
    labelFontSize,
    labelOffsetY:glyphFontSize * 0.7,
    riseDistancePixels:Math.max(18, scalingFactors.roomFontHeight * 1.5),
    onProcessRoomEffect:_onProcessRoomEffect
  };
}

export { TAKE_ITEM_EFFECT_DURATION };
