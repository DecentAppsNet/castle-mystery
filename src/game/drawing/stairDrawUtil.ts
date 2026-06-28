/* This module groups staircase cuboid drawing helpers for room rendering.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import { COLOR_BLACK, COLOR_STAIR_FRONT_FILL, COLOR_STAIR_SIDE_FILL, COLOR_STAIR_TOP_FILL } from "./drawColorConstants";
import { gameToCanvasPosition } from "./drawUtil";
import { FLOOR_WAYPOINT_Y_OFFSET } from "../waypointUtil";
import { STAIR_POSITION_TOLERANCE } from "../stairUtil";
import { calcPanelOffset } from "./roomPanelProjectionUtil";
import { drawProjectedCuboid } from "./cuboidDrawUtil";
import { createTiledTextureFaceCanvas, TextureFaceImage } from "./textureFaceDrawUtil";
import Position from "../types/Position";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import StairPart, { StairPartType } from "../types/StairPart";
import ImageSet from "../types/ImageSet";
import { COLUMNS_PER_MAP_TILE, LAYERS_PER_MAP_TILE, MAP_TILE_SIZE } from "../roomGridUtil";
import { ROOM_FULL_DEPTH, ROOM_ROW_DEPTH, ROOM_DEPTH_ROW_COUNT } from "../roomSpaceConstants";

const PREFERRED_STEP_RISE_RUN = 1;
const STAIR_ANGLE_TOLERANCE = FLOOR_WAYPOINT_Y_OFFSET + STAIR_POSITION_TOLERANCE;
const STAIR_CUBOID_DEPTH = ROOM_ROW_DEPTH;
const _stairTextureFaceImageCache = new Map<string, TextureFaceImage|null>();

function _calcStairStepCount(totalDistance:number):number {
  return Math.max(1, Math.round(totalDistance / PREFERRED_STEP_RISE_RUN));
}

function _projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

function _calcHorizontalTextureCount(width:number):number {
  return width * (COLUMNS_PER_MAP_TILE / MAP_TILE_SIZE);
}

function _calcVerticalTextureCount(height:number):number {
  return height * (LAYERS_PER_MAP_TILE / MAP_TILE_SIZE);
}

function _calcDepthTextureCount(depth:number):number {
  return depth * (ROOM_DEPTH_ROW_COUNT / ROOM_FULL_DEPTH);
}

function _findStairTextureFaceImage(room:Room, imageSet:ImageSet|null, faceName:'top'|'side'|'front',
  horizontalCount:number, verticalCount:number, textureLightness:number):TextureFaceImage|null {
  const stairTexture = room.stairTexture;
  if (!stairTexture || !imageSet) return null;
  const image = imageSet.get(stairTexture.imageUrl) || null;
  if (!image || image.width <= 0 || image.height <= 0) return null;

  const cacheKey = [
    room.id,
    faceName,
    stairTexture.imageUrl,
    horizontalCount,
    verticalCount,
    textureLightness,
    stairTexture.horizontalCount,
    stairTexture.verticalCount,
    stairTexture.modifiers.map(modifier => JSON.stringify(modifier)).join('|')
  ].join('|');
  if (_stairTextureFaceImageCache.has(cacheKey)) return _stairTextureFaceImageCache.get(cacheKey) || null;

  const faceImage = createTiledTextureFaceCanvas(
    image,
    stairTexture,
    horizontalCount,
    verticalCount,
    textureLightness,
    `${room.id}|stairTexture|${faceName}|${horizontalCount}|${verticalCount}`
  );
  _stairTextureFaceImageCache.set(cacheKey, faceImage);
  return faceImage;
}

function _drawStairCuboid(leftX:number, topY:number, width:number, height:number, z:number, depth:number,
  room:Room, imageSet:ImageSet|null, textureLightness:number,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const rightX = leftX + width;
  const bottomY = topY + height;
  const backTopLeft = _projectRoomPointWithDepth(leftX, topY, z, scalingFactors);
  const backTopRight = _projectRoomPointWithDepth(rightX, topY, z, scalingFactors);
  const backBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z, scalingFactors);
  const frontTopLeft = _projectRoomPointWithDepth(leftX, topY, z + depth, scalingFactors);
  const frontTopRight = _projectRoomPointWithDepth(rightX, topY, z + depth, scalingFactors);
  const frontBottomLeft = _projectRoomPointWithDepth(leftX, bottomY, z + depth, scalingFactors);
  const frontBottomRight = _projectRoomPointWithDepth(rightX, bottomY, z + depth, scalingFactors);
  const topFaceImage = _findStairTextureFaceImage(room, imageSet, 'top', _calcHorizontalTextureCount(width), _calcDepthTextureCount(depth), textureLightness);
  const sideFaceImage = _findStairTextureFaceImage(room, imageSet, 'side', _calcDepthTextureCount(depth), _calcVerticalTextureCount(height), textureLightness);
  const frontFaceImage = _findStairTextureFaceImage(room, imageSet, 'front', _calcHorizontalTextureCount(width), _calcVerticalTextureCount(height), textureLightness);
  drawProjectedCuboid({
    backTopLeft,
    backTopRight,
    backBottomLeft,
    frontTopLeft,
    frontTopRight,
    frontBottomLeft,
    frontBottomRight
  }, {
    topFillStyle:COLOR_STAIR_TOP_FILL,
    sideFillStyle:COLOR_STAIR_SIDE_FILL,
    frontFillStyle:COLOR_STAIR_FRONT_FILL,
    topFaceImage,
    sideFaceImage,
    frontFaceImage,
    lineWidth:Math.max(1, scalingFactors.roomLineWidth * 0.2),
    strokeStyle:COLOR_BLACK
  }, context);
}

function _snapFlightTo45DegreesForDrawing(fromPosition:Position, toPosition:Position):{ fromPosition:Position, toPosition:Position } {
  const totalRise = toPosition.y - fromPosition.y;
  const totalRun = toPosition.x - fromPosition.x;
  const riseMagnitude = Math.abs(totalRise);
  const runMagnitude = Math.abs(totalRun);
  if (Math.abs(riseMagnitude - runMagnitude) > STAIR_ANGLE_TOLERANCE) return { fromPosition, toPosition };
  return {
    fromPosition,
    toPosition:{
      x:toPosition.x,
      y:fromPosition.y + Math.sign(totalRise) * runMagnitude,
      z:toPosition.z
    }
  };
}

function _drawStairsAtRow(fromPosition:Position, toPosition:Position, z:number, room:Room, imageSet:ImageSet|null,
  textureLightness:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const snappedFlight = _snapFlightTo45DegreesForDrawing(fromPosition, toPosition);
  const totalRise = snappedFlight.toPosition.y - snappedFlight.fromPosition.y;
  const totalRun = snappedFlight.toPosition.x - snappedFlight.fromPosition.x;
  assert(Math.abs(Math.abs(totalRise) - Math.abs(totalRun)) <= STAIR_POSITION_TOLERANCE, 'stairs must be drawn at a 45 degree angle');

  const stepCount = _calcStairStepCount(Math.max(Math.abs(totalRise), Math.abs(totalRun)));
  const stepRise = totalRise / stepCount;
  const stepRun = totalRun / stepCount;
  let currentX = snappedFlight.fromPosition.x;
  let currentY = snappedFlight.fromPosition.y;
  for (let i = 0; i < stepCount; i++) {
    const nextX = currentX + stepRun;
    const nextY = currentY + stepRise;
    _drawStairCuboid(Math.min(currentX, nextX), Math.min(currentY, nextY), Math.abs(stepRun), Math.abs(stepRise), z, STAIR_CUBOID_DEPTH,
      room, imageSet, textureLightness, scalingFactors, context);
    currentX = nextX;
    currentY = nextY;
  }
}

export function drawStairPart(stairPart:StairPart, room:Room, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, imageSet:ImageSet|null = null, textureLightness:number = 1) {
  switch(stairPart.type) {
    case StairPartType.flight:
      _drawStairsAtRow(stairPart.startPosition, stairPart.endPosition, stairPart.z, room, imageSet, textureLightness, scalingFactors, context);
      return;
    case StairPartType.landing:
    case StairPartType.catwalk:
      _drawStairCuboid(stairPart.leftX, stairPart.topY, stairPart.width, stairPart.height, stairPart.z, stairPart.depth,
        room, imageSet, textureLightness, scalingFactors, context);
      return;
  }
}