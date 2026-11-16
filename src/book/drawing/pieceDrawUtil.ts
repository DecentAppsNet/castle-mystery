/* This file calculates complementary piece-border flair polygons in canvas pixels.
	 If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Piece-border appearance is verified visually. @preserve */

import { assert } from "decent-portal";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";

const FLAIR_PROFILES:ReadonlyArray<ReadonlyArray<Point>> = [
	[[0, 0], [0, .3], [1, .3], [1, .7], [0, .7], [0, 1]],
	[[0, 0], [0, .25], [1, .5], [0, .75], [0, 1]],
	[[1, 0], [0, 1]],
	[[0, 0], [0, .35], [.5, .35], [.5, .65], [1, .65], [1, 1]],
	[[1, 0], [0, .5], [1, 1]],
	[[0, 0], [1, .25], [0, .5], [1, .75], [0, 1]],
	[[0, 0], [0, .35], [1, .2], [1, .8], [0, .65], [0, 1]],
	[[0, 0], [1, .35], [0, .65], [1, 1]]
];

export function calcPieceBorderPolygon(rect:Rect, styleNo:number, flairMargin:number):Point[] {
	// Profiles use fractions of the side's inset width and the rectangle's height.
	assert(Number.isInteger(styleNo) && styleNo > 0);
	assert(rect.width >= 0 && rect.height >= 0);
	assert(Number.isFinite(flairMargin) && flairMargin >= 0 && flairMargin <= rect.width / 2);
	const profile = FLAIR_PROFILES[styleNo % FLAIR_PROFILES.length];

	// Translate, rather than mirror, the profile so neighboring edges can interlock.
	const leftSide:Point[] = profile.map(([inset, height]) =>
		[rect.x + inset * flairMargin, rect.y + height * rect.height]);
	const rightSide:Point[] = profile.map(([inset, height]) =>
		[rect.x + rect.width - flairMargin + inset * flairMargin, rect.y + height * rect.height]);
	return [...leftSide, ...rightSide.reverse()];
}