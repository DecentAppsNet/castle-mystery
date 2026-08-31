/* This file creates animated take-item transfer effects for hand and inventory destinations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumberPair } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "@/game/drawing/itemDrawUtil";
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import Position, { duplicatePosition } from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import { EffectHandlerResult } from "./types/EffectHandler";

const TAKE_EFFECT_TIME = 500;

type CharacterDrawCall = Extract<EffectDrawCall, { stage:'beforeCharacter'|'afterCharacter' }>;

function _getSourceCanvasPoint(drawCall:CharacterDrawCall, item:Item, sourceFloorPosition:Position,
    sourceRoomItemI:number, scalingFactors:ScalingFactors):[number, number] {
  const displayPosition = drawCall.characterContext.itemTransfer.roomContentDisplayLayout
    .findProspectiveItemDisplayPosition(item, sourceFloorPosition, sourceRoomItemI);
  return getItemCanvasPositionInRoom(displayPosition, scalingFactors);
}

function _getDestinationCanvasPoint(drawCall:CharacterDrawCall,
    destinationPlacement:CharacterOwnedItemPlacement):[number, number] {
  const itemTransfer = drawCall.characterContext.itemTransfer;
  if (destinationPlacement === INVENTORY) return itemTransfer.characterCenterCanvasPoint;
  return destinationPlacement === LEFT_HAND
    ? itemTransfer.leftHandItemCanvasPoint
    : itemTransfer.rightHandItemCanvasPoint;
}

function _handleTake(drawCall:EffectDrawCall, item:Item, destinationPlacement:CharacterOwnedItemPlacement,
    sourceFloorPosition:Position, sourceRoomItemI:number, startTime:number, endTime:number,
    scalingFactors:ScalingFactors, time:number, context:CanvasRenderingContext2D):EffectHandlerResult|null {
  if (drawCall.stage === 'afterLevel') return null;
  const source = _getSourceCanvasPoint(drawCall, item, sourceFloorPosition, sourceRoomItemI, scalingFactors);
  const destination = _getDestinationCanvasPoint(drawCall, destinationPlacement);
  const progress = clamp((time - startTime) / (endTime - startTime), 0, 1);
  const animated = interpolateNumberPair(source, destination, progress);
  if (destinationPlacement === INVENTORY) {
    if (drawCall.stage === 'beforeCharacter') return null;
    drawItemAtCanvasPositionInRoom(item, animated[0], animated[1], scalingFactors, context,
      drawCall.characterContext.itemTransfer.imageSet);
    return null;
  }
  if (drawCall.stage === 'afterCharacter') return null;
  return { spriteOverrides:[{
    spriteKind:destinationPlacement === LEFT_HAND ? 'leftHandItem' : 'rightHandItem',
    transformType:'translateCanvas',
    translateCanvasX:animated[0] - destination[0],
    translateCanvasY:animated[1] - destination[1]
  }] };
}

export function createTakeEffect(item:Item, destinationPlacement:CharacterOwnedItemPlacement,
    sourceFloorPosition:Position, sourceRoomItemI:number, startTime:number):Effect {
  const endTime = startTime + TAKE_EFFECT_TIME;
  const effectItem = duplicateItem(item);
  const effectSourcePosition = duplicatePosition(sourceFloorPosition);
  return {
    kind:'takeItem',
    startTime,
    endTime,
    handler:(drawCall, scalingFactors, time, _metaTime, context) =>
      _handleTake(drawCall, effectItem, destinationPlacement, effectSourcePosition, sourceRoomItemI,
        startTime, endTime, scalingFactors, time, context)
  }
}