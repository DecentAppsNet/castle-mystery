import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "../drawing/drawUtil";
import { calcItemDrawMetrics, drawItemAtCanvasPosition } from "../drawing/itemDrawUtil";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import TakeItemEffect from "./types/TakeItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

function _drawAnimatedItem(takeItemEffect:TakeItemEffect, context:CanvasRenderingContext2D, progress:number) {
  const y = takeItemEffect.startCanvasY - progress * takeItemEffect.riseDistancePixels;
  drawItemAtCanvasPosition(takeItemEffect.item, takeItemEffect.startCanvasX, y, {
    glyphFontSize:takeItemEffect.glyphFontSize,
    labelFontSize:takeItemEffect.labelFontSize,
    labelOffsetY:takeItemEffect.labelOffsetY
  }, context);
}

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean):boolean {
  const takeItemEffect = effect as TakeItemEffect;
  const elapsed = Date.now() - takeItemEffect.startTime;
  if (!isActive) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  _drawAnimatedItem(takeItemEffect, context, progress);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createTakeItemEffect(item:Item, room:Room, time:number, scalingFactors:ScalingFactors):TakeItemEffect {
  const [startCanvasX, startCanvasY] = gameToCanvasPosition(item.position.x, item.position.y, scalingFactors);
  const metrics = calcItemDrawMetrics(scalingFactors);
  return {
    type:EffectType.TAKE_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasX,
    startCanvasY,
    glyphFontSize:metrics.glyphFontSize,
    labelFontSize:metrics.labelFontSize,
    labelOffsetY:metrics.labelOffsetY,
    riseDistancePixels:Math.max(18, scalingFactors.roomFontHeight * 1.5),
    onProcessRoomEffect:_onProcessRoomEffect
  };
}
