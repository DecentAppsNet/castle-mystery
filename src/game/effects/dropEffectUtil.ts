/* This file creates drop-item transfer effects for hand-held and inventory items.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { clamp, interpolateNumber } from "@/common/numberUtil";
import { drawItemAtCanvasPositionInRoom, getItemCanvasPositionInRoom } from "@/game/drawing/itemDrawUtil";
import { CharacterOwnedItemPlacement, INVENTORY, LEFT_HAND } from "@/game/itemOwnershipUtil";
import Item, { duplicateItem } from "@/game/types/Item";
import Position from "@/game/types/Position";
import ScalingFactors from "@/game/types/ScalingFactors";
import Effect from "./types/Effect";
import EffectDrawCall from "./types/EffectDrawCall";
import { EffectHandlerResult } from "./types/EffectHandler";

const DROP_EFFECT_TIME = 500;

function _interpolateCanvasPoint(from:[number, number], to:[number, number], progress:number):[number, number] {
  return [interpolateNumber(from[0], to[0], progress), interpolateNumber(from[1], to[1], progress)];
}

function _getDestinationCanvasPoint(drawCall:Extract<EffectDrawCall, { stage:'beforeCharacter'|'afterCharacter' }>,
  item:Item, destinationFloorPosition:Position, scalingFactors:ScalingFactors):[number, number] {
  const displayPosition = drawCall.characterContext.itemTransfer.roomContentDisplayLayout
    .findProspectiveItemDisplayPosition(item, destinationFloorPosition);
  return getItemCanvasPositionInRoom(displayPosition, scalingFactors);
}

function _handleDrop(drawCall:EffectDrawCall, item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    destinationFloorPosition:Position, startTime:number, endTime:number,
  scalingFactors:ScalingFactors, time:number,
    context:CanvasRenderingContext2D):EffectHandlerResult|null {
  if (drawCall.stage === 'afterLevel') return null;
  const itemTransfer = drawCall.characterContext.itemTransfer;
  const destination = _getDestinationCanvasPoint(drawCall, item, destinationFloorPosition, scalingFactors);
  const progress = clamp((time - startTime) / (endTime - startTime), 0, 1);
  if (sourcePlacement === INVENTORY) {
    if (drawCall.stage === 'beforeCharacter') return null;
    const [x, y] = _interpolateCanvasPoint(itemTransfer.characterCenterCanvasPoint, destination, progress);
    drawItemAtCanvasPositionInRoom(item, x, y, scalingFactors, context, itemTransfer.imageSet);
    return null;
  }
  if (drawCall.stage === 'afterCharacter') return null;
  const source = sourcePlacement === LEFT_HAND
    ? itemTransfer.leftHandItemCanvasPoint
    : itemTransfer.rightHandItemCanvasPoint;
  const animated = _interpolateCanvasPoint(source, destination, progress);
  return { spriteOverrides:[{
    spriteKind:sourcePlacement === LEFT_HAND ? 'leftHandItem' : 'rightHandItem',
    transformType:'translateCanvas',
    translateCanvasX:animated[0] - source[0],
    translateCanvasY:animated[1] - source[1]
  }] };
}

export function createDropEffect(item:Item, sourcePlacement:CharacterOwnedItemPlacement,
    destinationFloorPosition:Position, startTime:number):Effect {
  const endTime = startTime + DROP_EFFECT_TIME;
  const effectItem = duplicateItem(item);
  const effectDestination = { ...destinationFloorPosition };
  return {
    kind:'dropItem',
    startTime,
    endTime,
    handler:(drawCall, scalingFactors, time, _metaTime, context) =>
      _handleDrop(drawCall, effectItem, sourcePlacement, effectDestination, startTime, endTime,
        scalingFactors, time, context)
  }
}