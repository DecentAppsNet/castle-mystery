/* This file calculates complementary piece-border flair polygons and draws loose book pieces.
	 If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Piece-border appearance is verified visually. @preserve */

import { assert } from "decent-portal";
import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import Piece from "../types/Piece";
import PieceLayout from "./types/PieceLayout";
import { drawBorderedBookText, measureBookTextBox } from "./bookTextDrawUtil";
import { getPieceFlairProfile } from "../pieceFlairUtil";
import PieceDragState from '../types/PieceDragState';
import BookState from '../types/BookState';
import { getBookPieceBackgroundColor } from '../pieceColorUtil';

export function getPieceSlotColor(styleNo:number):string {
	return getPieceFlairProfile(styleNo).pieceSlotColor;
}

export function calcPieceBorderPolygon(rect:Rect, styleNo:number, flairMargin:number):Point[] {
	// Profiles use fractions of the side's inset width and the rectangle's height.
	assert(rect.width >= 0 && rect.height >= 0);
	assert(Number.isFinite(flairMargin) && flairMargin >= 0 && flairMargin <= rect.width / 2);
	const profile = getPieceFlairProfile(styleNo).borderPolygon;

	// Translate, rather than mirror, the profile so neighboring edges can interlock.
	const leftSide:Point[] = profile.map(([inset, height]) =>
		[rect.x + inset * flairMargin, rect.y + height * rect.height]);
	const rightSide:Point[] = profile.map(([inset, height]) =>
		[rect.x + rect.width - flairMargin + inset * flairMargin, rect.y + height * rect.height]);
	return [...leftSide, ...rightSide.reverse()];
}

export function preparePieceLayouts(pieces:ReadonlyArray<Piece>, bookRect:Readonly<Rect>,
	context:CanvasRenderingContext2D, dragState:Readonly<PieceDragState>|null = null):PieceLayout[] {
	// Size loose pieces consistently using the book height and the page text font.
	const lineHeight = bookRect.height * .045;
	const fontSizePixels = bookRect.height * .034;
	return pieces.map(piece => {
		const extracted = dragState?.piece === piece ? dragState.extractedAppearance : null;
		const metrics = extracted?.metrics ?? measureBookTextBox(piece.text, bookRect.width / 2, lineHeight, context, fontSizePixels);
		const width = metrics.width;
		const height = extracted?.height ?? lineHeight;
		const x = bookRect.x + bookRect.width * piece.xPercent / 100 - width / 2;
		const y = bookRect.y + bookRect.height * piece.yPercent / 100 - height / 2;
		const rect = { x, y, width, height };
		return { piece, rect, metrics, isVisible:true };
	});
}

export function drawBookPieces(pieceLayouts:ReadonlyArray<PieceLayout>,
	context:CanvasRenderingContext2D, bookState:Readonly<BookState>):void {
	for (const { piece, rect, metrics, isVisible } of pieceLayouts) {
		if (!isVisible) continue;
		const polygon = calcPieceBorderPolygon(rect, piece.styleNo, Math.min(metrics.padding, rect.width / 2));
		drawBorderedBookText(piece.text, rect, polygon, metrics.padding,
			metrics.fontSizePixels, '#392b20', getBookPieceBackgroundColor(bookState, piece), context);
	}
}