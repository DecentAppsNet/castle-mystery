import ScalingFactors from "../types/ScalingFactors";
import { MAP_TILE_SIZE } from "../roomGridUtil";
import { gameToCanvasPosition } from "./drawUtil";
import { ROOM_FRONT_ROW_MIN_Z, ROOM_MIDDLE_ROW_MIN_Z } from "../roomSpaceConstants";

export const RIGHT_WALL_DOOR_LEFT_Z = ROOM_MIDDLE_ROW_MIN_Z;
export const RIGHT_WALL_DOOR_RIGHT_Z = ROOM_FRONT_ROW_MIN_Z;
const PANEL_OFFSET_X_SCALE = 8;
const PANEL_OFFSET_Y_SCALE = 4;
const DOOR_HEIGHT_MAP_TILE_RATIO = 0.5;
const DOOR_ARCH_HEIGHT_RATIO = 0.35;
const DOOR_ARCH_SAMPLE_COUNT = 12;

export function calcPanelOffset(scalingFactors:ScalingFactors):[number, number] {
  return [
    scalingFactors.roomLineWidth * PANEL_OFFSET_X_SCALE,
    scalingFactors.roomLineWidth * PANEL_OFFSET_Y_SCALE
  ];
}

export function projectRoomPointWithDepth(x:number, y:number, z:number, scalingFactors:ScalingFactors):[number, number] {
  const [canvasX, canvasY] = gameToCanvasPosition(x, y, scalingFactors);
  const [offsetX, offsetY] = calcPanelOffset(scalingFactors);
  return [canvasX + offsetX * z, canvasY + offsetY * z];
}

export function getRightWallDoorHeightPixels(scalingFactors:ScalingFactors):number {
  return MAP_TILE_SIZE * DOOR_HEIGHT_MAP_TILE_RATIO * scalingFactors.scaleY;
}

function _createProjectedDoorArchPoints(rightWallX:number, doorBottomY:number, doorHeight:number,
  scalingFactors:ScalingFactors):Array<[number, number]> {
  const archHeight = doorHeight * DOOR_ARCH_HEIGHT_RATIO;
  const shoulderY = doorBottomY - doorHeight + archHeight;
  const zCenter = (RIGHT_WALL_DOOR_LEFT_Z + RIGHT_WALL_DOOR_RIGHT_Z) / 2;
  const zRadius = (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) / 2;
  const archPoints:Array<[number, number]> = [];

  for (let sampleIndex = 0; sampleIndex <= DOOR_ARCH_SAMPLE_COUNT; ++sampleIndex) {
    const progress = sampleIndex / DOOR_ARCH_SAMPLE_COUNT;
    const z = RIGHT_WALL_DOOR_RIGHT_Z - (RIGHT_WALL_DOOR_RIGHT_Z - RIGHT_WALL_DOOR_LEFT_Z) * progress;
    const normalizedZ = zRadius === 0 ? 0 : (z - zCenter) / zRadius;
    const y = shoulderY - archHeight * Math.sqrt(Math.max(0, 1 - normalizedZ * normalizedZ));
    archPoints.push(projectRoomPointWithDepth(rightWallX, y, z, scalingFactors));
  }

  return archPoints;
}

export function createProjectedRightWallDoorOutlinePoints(rightWallX:number, doorBottomY:number, doorHeight:number,
  scalingFactors:ScalingFactors):Array<[number, number]> {
  const archHeight = doorHeight * DOOR_ARCH_HEIGHT_RATIO;
  const bottomLeft = projectRoomPointWithDepth(rightWallX, doorBottomY, RIGHT_WALL_DOOR_LEFT_Z, scalingFactors);
  const bottomRight = projectRoomPointWithDepth(rightWallX, doorBottomY, RIGHT_WALL_DOOR_RIGHT_Z, scalingFactors);
  const shoulderLeft = projectRoomPointWithDepth(rightWallX, doorBottomY - doorHeight + archHeight, RIGHT_WALL_DOOR_LEFT_Z, scalingFactors);
  const shoulderRight = projectRoomPointWithDepth(rightWallX, doorBottomY - doorHeight + archHeight, RIGHT_WALL_DOOR_RIGHT_Z, scalingFactors);
  const archPoints = _createProjectedDoorArchPoints(rightWallX, doorBottomY, doorHeight, scalingFactors);
  return [bottomLeft, bottomRight, shoulderRight, ...archPoints, shoulderLeft];
}