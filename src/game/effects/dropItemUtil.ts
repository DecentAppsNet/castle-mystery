import { clamp } from "@/common/numberUtil";
import { calcItemDrawMetrics, drawItemAtCanvasPosition, getItemCanvasPositionInRoom } from "../drawing/itemDrawUtil";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import DropItemEffect from "./types/DropItemEffect";
import EffectType from "./types/EffectType";

export const ITEM_EFFECT_DURATION = 200;

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean):boolean {
  const dropItemEffect = effect as DropItemEffect;
  const elapsed = Date.now() - dropItemEffect.startTime;
  if (!isActive) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const x = dropItemEffect.startCanvasX + (dropItemEffect.endCanvasX - dropItemEffect.startCanvasX) * progress;
  const y = dropItemEffect.startCanvasY + (dropItemEffect.endCanvasY - dropItemEffect.startCanvasY) * progress;
  drawItemAtCanvasPosition(dropItemEffect.item, x, y, {
    cuboidWidthPixels:dropItemEffect.cuboidWidthPixels,
    cuboidHeightPixels:dropItemEffect.cuboidHeightPixels,
    cuboidDepthXPixels:dropItemEffect.cuboidDepthXPixels,
    cuboidDepthYPixels:dropItemEffect.cuboidDepthYPixels,
    cuboidLineWidthPixels:dropItemEffect.cuboidLineWidthPixels
  }, context);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createDropItemEffect(item:Item, room:Room, time:number, scalingFactors:ScalingFactors):DropItemEffect {
  const [endCanvasX, endCanvasY] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  return {
    type:EffectType.DROP_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasX:endCanvasX,
    startCanvasY:endCanvasY - Math.max(18, scalingFactors.roomFontHeight * 1.5),
    endCanvasX,
    endCanvasY,
    cuboidWidthPixels:metrics.cuboidWidthPixels,
    cuboidHeightPixels:metrics.cuboidHeightPixels,
    cuboidDepthXPixels:metrics.cuboidDepthXPixels,
    cuboidDepthYPixels:metrics.cuboidDepthYPixels,
    cuboidLineWidthPixels:metrics.cuboidLineWidthPixels,
    onProcessRoomEffect:_onProcessRoomEffect
  };
}