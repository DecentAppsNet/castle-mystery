import { clamp } from "@/common/numberUtil";
import { calcItemDrawMetrics, drawItemAtCanvasPosition, getItemCanvasPosition } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import GiveItemEffect from "./types/GiveItemEffect";
import { ITEM_EFFECT_DURATION } from "./dropItemUtil";

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean):boolean {
  const giveItemEffect = effect as GiveItemEffect;
  const elapsed = Date.now() - giveItemEffect.startTime;
  if (!isActive) return elapsed < ITEM_EFFECT_DURATION;
  const progress = clamp(elapsed / ITEM_EFFECT_DURATION, 0, 1);
  const x = giveItemEffect.startCanvasX + (giveItemEffect.endCanvasX - giveItemEffect.startCanvasX) * progress;
  const y = giveItemEffect.startCanvasY + (giveItemEffect.endCanvasY - giveItemEffect.startCanvasY) * progress;
  drawItemAtCanvasPosition(giveItemEffect.item, x, y, {
    cuboidWidthPixels:giveItemEffect.cuboidWidthPixels,
    cuboidHeightPixels:giveItemEffect.cuboidHeightPixels,
    cuboidDepthXPixels:giveItemEffect.cuboidDepthXPixels,
    cuboidDepthYPixels:giveItemEffect.cuboidDepthYPixels,
    cuboidLineWidthPixels:giveItemEffect.cuboidLineWidthPixels
  }, context);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createGiveItemEffect(item:Item, room:Room, giver:Character, recipient:Character, time:number, scalingFactors:ScalingFactors):GiveItemEffect {
  const [startCanvasX, startCanvasY] = getItemCanvasPosition({ ...item, position:{ x:giver.x, y:giver.y, z:giver.depth } }, scalingFactors);
  const [endCanvasX, endCanvasY] = getItemCanvasPosition({ ...item, position:{ x:recipient.x, y:recipient.y, z:recipient.depth } }, scalingFactors);
  const metrics = calcItemDrawMetrics(room, scalingFactors);
  return {
    type:EffectType.GIVE_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasX,
    startCanvasY,
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