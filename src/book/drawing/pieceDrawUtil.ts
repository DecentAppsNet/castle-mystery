/* This file calculates complementary piece-border flair polygons and draws loose book pieces.
	 If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Piece-border appearance is verified visually. @preserve */

import { assert } from "decent-portal";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import Piece from "../types/Piece";
import PieceLayout from "./types/PieceLayout";
import { drawBorderedBookText, measureBookTextBox } from "./bookTextDrawUtil";

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
	assert(Number.isInteger(styleNo) && styleNo >= 0);
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

export function preparePieceLayouts(pieces:ReadonlyArray<Piece>, bookRect:Readonly<Rect>,
	context:CanvasRenderingContext2D):PieceLayout[] {
	// Size loose pieces consistently using the book height and the page text font.
	const lineHeight = bookRect.height * .045;
	const fontSizePixels = bookRect.height * .034;
	return pieces.map(piece => {
		const metrics = measureBookTextBox(piece.text, bookRect.width / 2, lineHeight, context, fontSizePixels);
		const x = bookRect.x + bookRect.width * piece.xPercent / 100 - metrics.width / 2;
		const y = bookRect.y + bookRect.height * piece.yPercent / 100 - lineHeight / 2;
		const rect = { x, y, width:metrics.width, height:lineHeight };
		return { piece, rect, metrics, isVisible:true };
	});
}

export function drawBookPieces(pieceLayouts:ReadonlyArray<PieceLayout>,
	context:CanvasRenderingContext2D):void {
	for (const { piece, rect, metrics, isVisible } of pieceLayouts) {
		if (!isVisible) continue;
		const polygon = calcPieceBorderPolygon(rect, piece.styleNo, Math.min(metrics.padding, rect.width / 2));
		drawBorderedBookText(piece.text, rect, polygon, metrics.padding,
			metrics.fontSizePixels, '#392b20', '#d8b98d', context);
	}
}