/* This file projects obscured-room polygons and delegates their canvas overlay drawing.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { drawObscuredPolygon } from "@/common/drawing/obscurePolygonDrawUtil";
import Point from "../types/Point";
import Room from "../types/Room";
import ScalingFactors from "../types/ScalingFactors";
import { gameToCanvasPosition } from "./drawUtil";
import { projectRoomPointWithDepth } from "./roomPanelProjectionUtil";

function _createObscuredRoomPoints(room:Room, scalingFactors:ScalingFactors):Point[] {
  const [topLeftBackX, topLeftBackY] = gameToCanvasPosition(room.rect.x, room.rect.y, scalingFactors);
  const [topRightFrontX, topRightFrontY] = projectRoomPointWithDepth(room.rect.x + room.rect.width, room.rect.y, 1, scalingFactors);
  const [topRightBackX, topRightBackY] = gameToCanvasPosition(room.rect.x + room.rect.width, room.rect.y, scalingFactors);
  const [bottomRightFrontX, bottomRightFrontY] = projectRoomPointWithDepth(room.rect.x + room.rect.width, room.rect.y + room.rect.height, 1, scalingFactors);
  const [bottomLeftFrontX, bottomLeftFrontY] = projectRoomPointWithDepth(room.rect.x, room.rect.y + room.rect.height, 1, scalingFactors);
  const [bottomLeftBackX, bottomLeftBackY] = gameToCanvasPosition(room.rect.x, room.rect.y + room.rect.height, scalingFactors);

  return [
    [topLeftBackX, topLeftBackY],
    [topRightBackX, topRightBackY],
    [topRightFrontX, topRightFrontY],
    [bottomRightFrontX, bottomRightFrontY],
    [bottomLeftFrontX, bottomLeftFrontY],
    [bottomLeftBackX, bottomLeftBackY]
  ];
}

export function drawObscuredRoom(room:Room, scalingFactors:ScalingFactors, context:CanvasRenderingContext2D, metaTime:number) {
  const points = _createObscuredRoomPoints(room, scalingFactors);
  drawObscuredPolygon(points, context, metaTime);
}