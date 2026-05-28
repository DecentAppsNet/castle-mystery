import { clamp } from "@/common/numberUtil";
import { COLOR_ITEM_DISCOVERY_EFFECT } from "../drawing/drawConstants";
import { getItemCanvasPositionInRoom } from "../drawing/itemDrawUtil";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import ItemDiscoveryEffect from "./types/ItemDiscoveryEffect";
import EffectType from "./types/EffectType";

const ITEM_DISCOVERY_EFFECT_DURATION = 700;

function _drawDiscoveryRing(context:CanvasRenderingContext2D, itemDiscoveryEffect:ItemDiscoveryEffect, radius:number, alpha:number) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = COLOR_ITEM_DISCOVERY_EFFECT;
  context.lineWidth = itemDiscoveryEffect.lineWidth;
  context.beginPath();
  context.arc(itemDiscoveryEffect.centerCanvasX, itemDiscoveryEffect.centerCanvasY, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, isActive:boolean):boolean {
  const itemDiscoveryEffect = effect as ItemDiscoveryEffect;
  const elapsed = Date.now() - itemDiscoveryEffect.startTime;
  if (!isActive) return elapsed < ITEM_DISCOVERY_EFFECT_DURATION;

  const progress = clamp(elapsed / ITEM_DISCOVERY_EFFECT_DURATION, 0, 1);
  const waveProgress = progress * (itemDiscoveryEffect.ringCount + 1);
  for (let ringI = 0; ringI < itemDiscoveryEffect.ringCount; ++ringI) {
    const ringProgress = waveProgress - ringI;
    if (ringProgress < 0 || ringProgress > 1) continue;
    const radius = itemDiscoveryEffect.baseRadiusPixels
      + (itemDiscoveryEffect.maxRadiusPixels - itemDiscoveryEffect.baseRadiusPixels) * ringProgress;
    _drawDiscoveryRing(context, itemDiscoveryEffect, radius, 1 - ringProgress);
  }
  return elapsed < ITEM_DISCOVERY_EFFECT_DURATION;
}

export function createItemDiscoveryEffect(item:Item, room:Room, time:number, scalingFactors:ScalingFactors):ItemDiscoveryEffect {
  const [centerCanvasX, centerCanvasY] = getItemCanvasPositionInRoom(room, item, scalingFactors);
  const baseRadiusPixels = Math.max(10, scalingFactors.roomFontHeight * 0.7);
  return {
    type:EffectType.ITEM_DISCOVERY,
    room,
    startTime:time,
    centerCanvasX,
    centerCanvasY,
    baseRadiusPixels,
    maxRadiusPixels:Math.max(baseRadiusPixels + 18, scalingFactors.roomFontHeight * 2.2),
    lineWidth:Math.max(1.5, scalingFactors.roomLineWidth * 0.9),
    ringCount:3,
    onProcessRoomEffect:_onProcessRoomEffect
  };
}