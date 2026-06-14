/* This module groups item-emit bubble effect creation helpers for audible item sound overlays.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { drawEmitBubble, getCharacterBodyCenterCanvasPosition } from "../drawing/characterDrawUtil";
import { getItemCanvasRectInRoom } from "../drawing/itemDrawUtil";
import Character from "../types/Character";
import ImageSet from "../types/ImageSet";
import Item from "../types/Item";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import Effect from "./types/Effect";
import EffectType from "./types/EffectType";
import EmitBubbleEffect from "./types/EmitBubbleEffect";

function _findEmitBubbleAnchor(effect:EmitBubbleEffect, imageSet:ImageSet) {
  const itemInRoom = effect.room.items.some(item => item.id === effect.item.id);
  if (itemInRoom) {
    const rect = getItemCanvasRectInRoom(effect.room, effect.item, effect.scalingFactors, imageSet);
    return { anchorX:rect.x + rect.width / 2, anchorTopY:rect.y };
  }
  if (effect.ownerCharacter) {
    const center = getCharacterBodyCenterCanvasPosition(effect.ownerCharacter, effect.scalingFactors, effect.gameTime);
    return { anchorX:center.x, anchorTopY:center.y };
  }
  const rect = getItemCanvasRectInRoom(effect.room, effect.item, effect.scalingFactors, imageSet);
  return { anchorX:rect.x + rect.width / 2, anchorTopY:rect.y };
}

function _onProcessRoomEffect(_room:Room, effect:Effect, context:CanvasRenderingContext2D, _scalingFactors:ScalingFactors,
  _canDrawEffect:boolean, imageSet:ImageSet):boolean {
  const emitBubbleEffect = effect as EmitBubbleEffect;
  const { anchorX, anchorTopY } = _findEmitBubbleAnchor(emitBubbleEffect, imageSet);
  drawEmitBubble(emitBubbleEffect.emitText, anchorX, anchorTopY, emitBubbleEffect.scalingFactors, context);
  return false;
}

export function createEmitBubbleEffect(room:Room, item:Item, ownerCharacter:Character|null,
  emitText:string, scalingFactors:ScalingFactors, gameTime:number):EmitBubbleEffect {
  return {
    type:EffectType.EMIT_BUBBLE,
    room,
    item,
    ownerCharacter,
    emitText,
    scalingFactors,
    gameTime,
    startTime:Date.now(),
    onProcessRoomEffect:_onProcessRoomEffect
  };
}