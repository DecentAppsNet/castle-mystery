/* This module groups shared floor-square geometry calculations for room contents.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert } from "decent-portal";

import { COLUMN_WIDTH, roomWidthToColumnCount } from "./roomGridUtil";
import { FLOOR_WAYPOINT_Y_OFFSET, ROOM_BACK_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z } from "./roomSpaceConstants";
import Position from "./types/Position";
import Rect from "./types/Rect";
import Room from "./types/Room";

const FLOOR_ROW_CENTER_ZS = [ROOM_BACK_ROW_CENTER_Z, ROOM_MIDDLE_ROW_CENTER_Z, ROOM_FRONT_ROW_CENTER_Z] as const;

export function calcRoomFloorY(roomRect:Rect):number {
	return roomRect.y + roomRect.height - FLOOR_WAYPOINT_Y_OFFSET;
}

export function calcFloorSquareCenter(roomRect:Rect, columnI:number, rowI:number):Position {
	assert(columnI >= 0 && columnI < roomWidthToColumnCount(roomRect.width));
	assert(rowI >= 0 && rowI < FLOOR_ROW_CENTER_ZS.length);
	return {
		x:roomRect.x + (columnI + 0.5) * COLUMN_WIDTH,
		y:calcRoomFloorY(roomRect),
		z:FLOOR_ROW_CENTER_ZS[rowI]
	};
}

function _findNearestFloorRowI(z:number):number {
	let nearestRowI = 0;
	for (let rowI = 1; rowI < FLOOR_ROW_CENTER_ZS.length; rowI++) {
		if (Math.abs(FLOOR_ROW_CENTER_ZS[rowI] - z) < Math.abs(FLOOR_ROW_CENTER_ZS[nearestRowI] - z)) nearestRowI = rowI;
	}
	return nearestRowI;
}

export function findNearestFloorSquareCenter(room:Room, position:Position):Position {
	const columnCount = roomWidthToColumnCount(room.rect.width);
	const unclampedColumnI = Math.round((position.x - room.rect.x) / COLUMN_WIDTH - 0.5);
	const columnI = Math.max(0, Math.min(columnCount - 1, unclampedColumnI));
	return calcFloorSquareCenter(room.rect, columnI, _findNearestFloorRowI(position.z));
}