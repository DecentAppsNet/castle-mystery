import { clamp } from "@/common/numberUtil";
import { gameToCanvasPosition } from "../drawing/drawUtil";
import { calcItemDrawMetrics, drawItemAtCanvasPosition } from "../drawing/itemDrawUtil";
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
    glyphFontSize:giveItemEffect.glyphFontSize,
    labelFontSize:giveItemEffect.labelFontSize,
    labelOffsetY:giveItemEffect.labelOffsetY
  }, context);
  return elapsed < ITEM_EFFECT_DURATION;
}

export function createGiveItemEffect(item:Item, room:Room, giver:Character, recipient:Character, time:number, scalingFactors:ScalingFactors):GiveItemEffect {
  const [startCanvasX, startCanvasY] = gameToCanvasPosition(giver.x, giver.y, scalingFactors);
  const [endCanvasX, endCanvasY] = gameToCanvasPosition(recipient.x, recipient.y, scalingFactors);
  const metrics = calcItemDrawMetrics(scalingFactors);
  return {
    type:EffectType.GIVE_ITEM,
    room,
    item:{ ...item, position:{ ...item.position } },
    startTime:time,
    startCanvasX,
    startCanvasY,
    endCanvasX,
    endCanvasY,
    glyphFontSize:metrics.glyphFontSize,
    labelFontSize:metrics.labelFontSize,
    labelOffsetY:metrics.labelOffsetY,
    onProcessRoomEffect:_onProcessRoomEffect
  };
}