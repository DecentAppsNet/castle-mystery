/* This module groups room-panel drawing helpers for wall panels, floors, and room-side surfaces.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import { ROOM_DEPTH_ROW_COUNT } from "../roomSpaceConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset, createProjectedRightWallDoorOutlinePoints, getRightWallDoorHeightPixels } from "./roomPanelProjectionUtil";
import { findRightWallPanelSpans } from "../rightWallPanelUtil";
import { roomWidthToColumnCount } from "../roomGridUtil";

function _fillPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  _traceClosedPolygon(points, context);
  context.fill();
}

function _drawShearedTiledPanel(image:ImageBitmap, origin:[number, number], horizontalVector:[number, number],
  depthVector:[number, number], totalHorizontalCount:number, horizontalSpanCount:number, totalDepthCount:number, depthSpanCount:number,
  points:Array<[number, number]>, context:CanvasRenderingContext2D) {
  const tileHorizontalVector:[number, number] = [
    horizontalVector[0] * (horizontalSpanCount / totalHorizontalCount),
    horizontalVector[1] * (horizontalSpanCount / totalHorizontalCount)
  ];
  const tileDepthVector:[number, number] = [
    depthVector[0] * (depthSpanCount / totalDepthCount),
    depthVector[1] * (depthSpanCount / totalDepthCount)
  ];
  const horizontalTileCount = Math.ceil(totalHorizontalCount / horizontalSpanCount);
  const depthTileCount = Math.ceil(totalDepthCount / depthSpanCount);
  if ((tileHorizontalVector[0] === 0 && tileHorizontalVector[1] === 0) || (tileDepthVector[0] === 0 && tileDepthVector[1] === 0)) return;

  context.save();
  _traceClosedPolygon(points, context);
  context.clip();
  for (let depthTileIndex = 0; depthTileIndex < depthTileCount; ++depthTileIndex) {
    for (let horizontalTileIndex = 0; horizontalTileIndex < horizontalTileCount; ++horizontalTileIndex) {
      const tileOriginX = origin[0] + tileHorizontalVector[0] * horizontalTileIndex + tileDepthVector[0] * depthTileIndex;
      const tileOriginY = origin[1] + tileHorizontalVector[1] * horizontalTileIndex + tileDepthVector[1] * depthTileIndex;
      context.save();
      context.transform(
        tileHorizontalVector[0] / image.width,
        tileHorizontalVector[1] / image.width,
        tileDepthVector[0] / image.height,
        tileDepthVector[1] / image.height,
        tileOriginX,
        tileOriginY
      );
      context.drawImage(image, 0, 0);
      context.restore();
    }
  }
  context.restore();
}

function _traceClosedPolygon(points:Array<[number, number]>, context:CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
}

function _fillPanelWithCutouts(points:Array<[number, number]>, cutoutPoints:Array<Array<[number, number]>>,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  cutoutPoints.forEach(cutout => {
    context.moveTo(...cutout[0]);
    for (let pointIndex = 1; pointIndex < cutout.length; ++pointIndex) {
      context.lineTo(...cutout[pointIndex]);
    }
    context.closePath();
  });
  context.fill("evenodd");
}

function _strokePanelSegment(fromPoint:[number, number], toPoint:[number, number], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

function _drawRightWallPanelSpan(room:Room, topY:number, height:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const rightWallX = room.rect.x + room.rect.width;
  const doorHeight = getRightWallDoorHeightPixels(scalingFactors) / scalingFactors.scaleY;
  const topRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY + height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerTopRight:[number, number] = [topRight[0] + offsetX, topRight[1] + offsetY];
  const panelPoints:Array<[number, number]> = [
    topRight,
    bottomRight,
    outerBottomRight,
    outerTopRight
  ];
  const cutoutPoints = _findRightWallPanelSpanExits(room, topY, height)
    .map(exit => createProjectedRightWallDoorOutlinePoints(rightWallX, exit.y, doorHeight, scalingFactors));

  if (cutoutPoints.length === 0) {
    _fillPanel(panelPoints, scalingFactors, context);
  } else {
    _fillPanelWithCutouts(panelPoints, cutoutPoints, scalingFactors, context);
  }

  _strokePanelSegment(topRight, bottomRight, scalingFactors, context);
  _strokePanelSegment(topRight, outerTopRight, scalingFactors, context);
  _strokePanelSegment(outerTopRight, outerBottomRight, scalingFactors, context);
}

function _isRightWallExit(room:Room, exit:RoomExit):boolean {
  return exit.x === room.rect.x + room.rect.width;
}

function _findRightWallPanelSpanExits(room:Room, topY:number, height:number):RoomExit[] {
  const bottomY = topY + height;
  return room.exits
    .filter(exit => _isRightWallExit(room, exit) && exit.y > topY && exit.y <= bottomY)
    .sort((exit1, exit2) => exit1.y - exit2.y);
}

export function drawFloorPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, imageSet:ImageSet|null = null) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const bottomLeft = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerBottomLeft:[number, number] = [bottomLeft[0] + offsetX, bottomLeft[1] + offsetY];
  const panelPoints:Array<[number, number]> = [
    bottomLeft,
    bottomRight,
    outerBottomRight,
    outerBottomLeft
  ];
  const floorTexture = room.floorTexture;
  const floorImage = floorTexture ? imageSet?.get(floorTexture.imageUrl) || null : null;
  if (floorTexture && floorImage && floorImage.width > 0 && floorImage.height > 0) {
    _drawShearedTiledPanel(
      floorImage,
      bottomLeft,
      [bottomRight[0] - bottomLeft[0], bottomRight[1] - bottomLeft[1]],
      [outerBottomLeft[0] - bottomLeft[0], outerBottomLeft[1] - bottomLeft[1]],
      roomWidthToColumnCount(room.rect.width),
      floorTexture.horizontalCount,
      ROOM_DEPTH_ROW_COUNT,
      floorTexture.verticalCount,
      panelPoints,
      context
    );
  } else {
    _fillPanel(panelPoints, scalingFactors, context);
  }
  _strokePanelSegment(bottomRight, outerBottomRight, scalingFactors, context);
  _strokePanelSegment(outerBottomRight, outerBottomLeft, scalingFactors, context);
  _strokePanelSegment(outerBottomLeft, bottomLeft, scalingFactors, context);
}

export function drawRightWallPanel(room:Room, rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  findRightWallPanelSpans(room, rooms).forEach(span => _drawRightWallPanelSpan(room, span.topY, span.height, scalingFactors, context));
}