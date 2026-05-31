import Room from "../types/Room";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";

const PANEL_OFFSET_X_SCALE = 8;
const PANEL_OFFSET_Y_SCALE = 4;

type RightWallPanelSpan = Readonly<{
  topY:number,
  height:number
}>;

function _fillPanel(points:Array<[number, number]>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
  context.fill();
}

function _strokePanelSegment(fromPoint:[number, number], toPoint:[number, number], scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  context.lineWidth = scalingFactors.roomLineWidth;
  context.beginPath();
  context.moveTo(...fromPoint);
  context.lineTo(...toPoint);
  context.stroke();
}

export function calcPanelOffset(scalingFactors:ScalingFactors):[number, number] {
  return [
    scalingFactors.roomLineWidth * PANEL_OFFSET_X_SCALE,
    scalingFactors.roomLineWidth * PANEL_OFFSET_Y_SCALE
  ];
}

function _doesInsideRoomTouchRightWallStory(room:Room, rooms:ReadonlyArray<Room>, storyTopY:number, storyHeight:number):boolean {
  const rightWallX = room.rect.x + room.rect.width;
  const storyBottomY = storyTopY + storyHeight;
  return rooms.some(candidate => candidate.id !== room.id
    && !candidate.isOutside
    && candidate.rect.x === rightWallX
    && candidate.rect.y < storyBottomY
    && candidate.rect.y + candidate.rect.height > storyTopY);
}

export function findRightWallPanelSpans(room:Room, rooms:ReadonlyArray<Room>):RightWallPanelSpan[] {
  const roomBottomY = room.rect.y + room.rect.height;
  const spans:RightWallPanelSpan[] = [];
  let activeSpan:RightWallPanelSpan|null = null;

  for (let storyTopY = room.rect.y; storyTopY < roomBottomY; storyTopY += MAP_TILE_SIZE) {
    const storyHeight = Math.min(MAP_TILE_SIZE, roomBottomY - storyTopY);
    const shouldDrawStory = !room.isOutside || _doesInsideRoomTouchRightWallStory(room, rooms, storyTopY, storyHeight);

    if (!shouldDrawStory) {
      if (activeSpan) spans.push(activeSpan);
      activeSpan = null;
      continue;
    }

    if (activeSpan && activeSpan.topY + activeSpan.height === storyTopY) {
      activeSpan = { topY:activeSpan.topY, height:activeSpan.height + storyHeight };
      continue;
    }

    if (activeSpan) spans.push(activeSpan);
    activeSpan = { topY:storyTopY, height:storyHeight };
  }

  if (activeSpan) spans.push(activeSpan);
  return spans;
}

function _drawRightWallPanelSpan(room:Room, topY:number, height:number, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const topRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, topY + height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerTopRight:[number, number] = [topRight[0] + offsetX, topRight[1] + offsetY];
  _fillPanel([
    topRight,
    bottomRight,
    outerBottomRight,
    outerTopRight
  ], scalingFactors, context);
  _strokePanelSegment(topRight, outerTopRight, scalingFactors, context);
  _strokePanelSegment(outerTopRight, outerBottomRight, scalingFactors, context);
}

export function drawFloorPanel(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  const bottomLeft = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);
  const bottomRight = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y + room.rect.height, scalingFactors);
  const outerBottomRight:[number, number] = [bottomRight[0] + offsetX, bottomRight[1] + offsetY];
  const outerBottomLeft:[number, number] = [bottomLeft[0] + offsetX, bottomLeft[1] + offsetY];
  _fillPanel([
    bottomLeft,
    bottomRight,
    outerBottomRight,
    outerBottomLeft
  ], scalingFactors, context);
  _strokePanelSegment(bottomRight, outerBottomRight, scalingFactors, context);
  _strokePanelSegment(outerBottomRight, outerBottomLeft, scalingFactors, context);
  _strokePanelSegment(outerBottomLeft, bottomLeft, scalingFactors, context);
}

export function drawRightWallPanel(room:Room, rooms:ReadonlyArray<Room>, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  findRightWallPanelSpans(room, rooms).forEach(span => _drawRightWallPanelSpan(room, span.topY, span.height, scalingFactors, context));
}