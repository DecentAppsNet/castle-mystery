/* This module groups shared color constants and texture-lightness constants used by game drawing and draw-driven effects.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export const COLOR_BLACK = "#000";
export const COLOR_DARK_GRAY = "#333";
export const COLOR_ACTIVE_ROOM_FILL = "#f2f2f2";
export const COLOR_ACTIVE_FLOOR_FILL = "#fff";
export const COLOR_ACTIVE_RIGHT_WALL_FILL = "#ddd";
export const COLOR_INACTIVE_ROOM_FILL = "#aaa";
export const COLOR_INACTIVE_FLOOR_FILL = "#bbb";
export const COLOR_INACTIVE_RIGHT_WALL_FILL = "#999";
export const COLOR_STAIR_FRONT_FILL = "#aaa";
export const COLOR_STAIR_TOP_FILL = "#bbb";
export const COLOR_STAIR_SIDE_FILL = "#999";
export const COLOR_ROOM_TITLE_TEXT = "#ddd";
export const COLOR_ACTIVE_CHARACTER_HIGHLIGHT = "#ffe60040";
export const COLOR_ITEM_POPOVER_HIGHLIGHT = "#ffe60088";
export const COLOR_CHARACTER_SELECT_EFFECT = "#ffe600";
export const COLOR_SPEECH_BUBBLE_FILL = "#fff8cc";
export const COLOR_POPOVER_FILL = "#fff";

export const ACTIVE_FLOOR_TEXTURE_LIGHTNESS = 1;
export const ACTIVE_BACK_WALL_TEXTURE_LIGHTNESS = 0.85;
export const ACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS = 0.7;
export const INACTIVE_FLOOR_TEXTURE_LIGHTNESS = 0.5;
export const INACTIVE_BACK_WALL_TEXTURE_LIGHTNESS = 0.35;
export const INACTIVE_RIGHT_WALL_TEXTURE_LIGHTNESS = 0.2;