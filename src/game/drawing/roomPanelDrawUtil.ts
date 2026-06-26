/* This module groups room-panel drawing helpers for wall panels, floors, and room-side surfaces.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Texture from "../types/Texture";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ScalingFactors from "../types/ScalingFactors";
import ImageSet from "../types/ImageSet";
import { ROOM_DEPTH_ROW_COUNT } from "../roomSpaceConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { calcPanelOffset, createProjectedRightWallDoorOutlinePoints, getRightWallDoorHeightPixels } from "./roomPanelProjectionUtil";
import { findRightWallPanelSpans } from "../rightWallPanelUtil";
import { roomHeightToLayerCount, roomWidthToColumnCount } from "../roomGridUtil";
import { createTiledTextureFaceCanvas } from "./textureFaceDrawUtil";

function _fillPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  _traceClosedPolygon(points, context);
  context.fill();
}

function _drawShearedTextureFace(faceWidth:number, faceHeight:number, faceImage:CanvasImageSource, origin:[number, number],
  horizontalVector:[number, number], depthVector:[number, number], points:Array<[number, number]>,
  context:CanvasRenderingContext2D, cutoutPoints:Array<Array<[number, number]>> = []) {
  context.save();
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
  context.clip("evenodd");
  context.transform(
    horizontalVector[0] / faceWidth,
    horizontalVector[1] / faceWidth,
    depthVector[0] / faceHeight,
    depthVector[1] / faceHeight,
    origin[0],
    origin[1]
  );
  context.drawImage(faceImage, 0, 0);
  context.restore();
}

function _drawShearedTiledPanel(image:ImageBitmap, texture:Texture, origin:[number, number], horizontalVector:[number, number],
  depthVector:[number, number], totalHorizontalCount:number, totalDepthCount:number,
  points:Array<[number, number]>, context:CanvasRenderingContext2D, cutoutPoints:Array<Array<[number, number]>> = [],
  textureLightness:number = 1, seedText:string) {
  const faceImage = createTiledTextureFaceCanvas(
    image,
    texture,
    totalHorizontalCount,
    totalDepthCount,
    textureLightness,
    seedText
  );
  if (faceImage) {
    _drawShearedTextureFace(faceImage.width, faceImage.height, faceImage.image, origin, horizontalVector, depthVector, points, context, cutoutPoints);
    return;
  }

  const tileHorizontalVector:[number, number] = [
    horizontalVector[0] * (texture.horizontalCount / totalHorizontalCount),
    horizontalVector[1] * (texture.horizontalCount / totalHorizontalCount)
  ];
  const tileDepthVector:[number, number] = [
    depthVector[0] * (texture.verticalCount / totalDepthCount),
    depthVector[1] * (texture.verticalCount / totalDepthCount)
  ];
  const horizontalTileCount = Math.ceil(totalHorizontalCount / texture.horizontalCount);
  const depthTileCount = Math.ceil(totalDepthCount / texture.verticalCount);
  if ((tileHorizontalVector[0] === 0 && tileHorizontalVector[1] === 0) || (tileDepthVector[0] === 0 && tileDepthVector[1] === 0)) return;

  context.save();
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
  context.clip("evenodd");
  context.filter = textureLightness === 1 ? "none" : `brightness(${textureLightness})`;
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

function _drawRightWallPanelSpan(room:Room, topY:number, height:number, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet|null = null, textureLightness:number = 1) {
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
  const rightWallTexture = room.rightWallTexture;
  const rightWallImage = rightWallTexture ? imageSet?.get(rightWallTexture.imageUrl) || null : null;

  if (rightWallTexture && rightWallImage && rightWallImage.width > 0 && rightWallImage.height > 0) {
    _drawShearedTiledPanel(
      rightWallImage,
      rightWallTexture,
      topRight,
      [outerTopRight[0] - topRight[0], outerTopRight[1] - topRight[1]],
      [bottomRight[0] - topRight[0], bottomRight[1] - topRight[1]],
      ROOM_DEPTH_ROW_COUNT,
      roomHeightToLayerCount(room.rect.height),
      panelPoints,
      context,
      cutoutPoints,
      textureLightness,
      `${room.id}|rightWallTexture|${topY}|${height}`
    );
  } else if (cutoutPoints.length === 0) {
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

export function drawFloorPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D,
  imageSet:ImageSet|null = null, textureLightness:number = 1) {
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
      floorTexture,
      bottomLeft,
      [bottomRight[0] - bottomLeft[0], bottomRight[1] - bottomLeft[1]],
      [outerBottomLeft[0] - bottomLeft[0], outerBottomLeft[1] - bottomLeft[1]],
      roomWidthToColumnCount(room.rect.width),
      ROOM_DEPTH_ROW_COUNT,
      panelPoints,
      context,
      [],
      textureLightness,
      `${room.id}|floorTexture`
    );
  } else {
    _fillPanel(panelPoints, scalingFactors, context);
  }
  _strokePanelSegment(bottomRight, outerBottomRight, scalingFactors, context);
  _strokePanelSegment(outerBottomRight, outerBottomLeft, scalingFactors, context);
  _strokePanelSegment(outerBottomLeft, bottomLeft, scalingFactors, context);
}

export function drawRightWallPanel(room:Room, rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet|null = null, textureLightness:number = 1) {
  findRightWallPanelSpans(room, rooms).forEach(span =>
    _drawRightWallPanelSpan(room, span.topY, span.height, scalingFactors, context, imageSet, textureLightness));
}