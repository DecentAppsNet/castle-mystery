/* This module groups room-grid sizing constants used by map and room layout calculations.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export const MAP_TILE_SIZE = 20;
export const COLUMNS_PER_MAP_TILE = 4;
export const LAYERS_PER_MAP_TILE = 4;

export function roomWidthToColumnCount(roomWidth:number):number {
	return Math.round(roomWidth / MAP_TILE_SIZE) * COLUMNS_PER_MAP_TILE;
}

export function roomHeightToLayerCount(roomHeight:number):number {
	return Math.round(roomHeight / MAP_TILE_SIZE) * LAYERS_PER_MAP_TILE;
}