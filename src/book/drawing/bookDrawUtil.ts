/* This file draws the book, page content, and navigation controls with their animations.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable, botch } from "decent-portal";

import { ImageSet } from "@/imageLoading";
import BookState from "../types/BookState";
import { calcBookDrawRect, calcPageViewOffsetX, isLeftPageNo, updateBookLayoutAsNeeded } from "./bookLayoutUtil";
import { getAnimationProgress } from "./bookAnimationUtil";
import { drawPage, drawPageFlip } from "./pages";
import Rect from "@/game/types/Rect";
import { drawBookPieces, preparePieceLayouts } from "./pieceDrawUtil";
import { getVisibleBookPieces, prepareBookPieceSlotPresentations } from "../pieces";
import PieceSlotLayout from "./types/PieceSlotLayout";
import BookControlId from "./types/BookControlId";
import PieceSlotPresentation from "../types/PieceSlotPresentation";
import { updateBookClaim, updateBookClaimControls, calcBookClaimShakeOffset, calcBookClaimTiming,
  calcBookClaimMessageAlpha, prepareBookClaimGlints, prepareBookClaimPieceFalls } from '../claiming';

export const BOOK_IMAGE_URL = '/assets/ui/book.png';

const BACKGROUND_ALPHA = .7;
const BOOK_CONTROL_ALPHA = .8;
const BOOK_CONTROL_POPOVER_DELAY_MS = 500;
const BOOK_CONTROL_POPOVER_FILL = '#fff6bf';
const BOOK_CONTROL_POPOVER_BORDER = '#000';
const BOOK_CONTROL_POPOVER_TEXT = '#000';
const BOOK_CONTROL_LABELS:Record<BookControlId, string> = {
  prevPage:'Previous Page',
  closeBook:'Hide Book',
  claim:'Claim this Conclusion',
  nextPage:'Next Page',
  nextChapter:'Visit Next Chapter',
  visitChapter:'Visit this Chapter'
};

function _drawTranslucentBackground(bookState:BookState, metaTime:number, context:CanvasRenderingContext2D) {
  let alphaFadeAmount = 1;
  if (bookState.animationKind === 'appear') {
    alphaFadeAmount = getAnimationProgress(bookState, metaTime);
  } else if (bookState.animationKind === 'disappear') {
    alphaFadeAmount = 1 - getAnimationProgress(bookState, metaTime);
  }

  context.save();
  context.fillStyle = 'black';
  context.globalAlpha = BACKGROUND_ALPHA * alphaFadeAmount;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}

function _drawBookImage(bookImage:ImageBitmap, rect:Rect, bookState:Readonly<BookState>, metaTime:number,
  context:CanvasRenderingContext2D):void {
  // Scope brightness to the image so its transparent pixels and all other layers remain unchanged.
  context.save();
  const claim = bookState.claimState;
  if (claim !== null) {
    const { envelope } = calcBookClaimTiming(metaTime - claim.startedAt, claim.blanks.length, claim.correct);
    context.filter = `brightness(${1 - envelope})`;
  }

  // Restore canvas state before PageWriter, loose pieces, and controls draw.
  context.drawImage(bookImage, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function _drawLeftArrow(context:CanvasRenderingContext2D) {
  context.moveTo(.1, .5);
  context.lineTo(.5, .1);
  context.lineTo(.5, .35);
  context.lineTo(.9, .35);
  context.lineTo(.9, .65);
  context.lineTo(.5, .65);
  context.lineTo(.5, .9);
}

function _drawRightArrow(context:CanvasRenderingContext2D) {
  context.translate(1, 0);
  context.scale(-1, 1);
  _drawLeftArrow(context);
}

function _drawCloseIcon(context:CanvasRenderingContext2D) {
  context.moveTo(.2, .1);
  context.lineTo(.5, .4);
  context.lineTo(.8, .1);
  context.lineTo(.9, .2);
  context.lineTo(.6, .5);
  context.lineTo(.9, .8);
  context.lineTo(.8, .9);
  context.lineTo(.5, .6);
  context.lineTo(.2, .9);
  context.lineTo(.1, .8);
  context.lineTo(.4, .5);
  context.lineTo(.1, .2);
}

function _drawClaimHand(context:CanvasRenderingContext2D) {
  // An open grasp: spread, curled fingertips narrowing into the palm and wrist.
  context.moveTo(.32, .94);
  context.lineTo(.30, .76);
  context.bezierCurveTo(.23, .66, .12, .59, .08, .47);
  context.bezierCurveTo(.04, .36, .12, .32, .18, .39);
  context.lineTo(.30, .53);
  context.lineTo(.23, .20);
  context.bezierCurveTo(.20, .06, .34, .03, .37, .16);
  context.lineTo(.43, .40);
  context.lineTo(.43, .10);
  context.bezierCurveTo(.43, -.02, .57, -.02, .57, .10);
  context.lineTo(.58, .38);
  context.lineTo(.63, .14);
  context.bezierCurveTo(.66, .02, .79, .05, .77, .18);
  context.lineTo(.73, .44);
  context.lineTo(.80, .28);
  context.bezierCurveTo(.86, .17, .97, .23, .92, .35);
  context.lineTo(.83, .64);
  context.bezierCurveTo(.80, .73, .72, .78, .70, .83);
  context.lineTo(.69, .94);
}

function _drawChapterArch(context:CanvasRenderingContext2D, offsetX:number) {
  context.moveTo(.25 + offsetX, .9);
  context.lineTo(.25 + offsetX, .3);
  context.bezierCurveTo(.25 + offsetX, -.02, .75 + offsetX, -.02, .75 + offsetX, .3);
  context.lineTo(.75 + offsetX, .9);
  context.lineTo(.63 + offsetX, .9);
  context.lineTo(.63 + offsetX, .3);
  context.bezierCurveTo(.63 + offsetX, .14, .37 + offsetX, .14, .37 + offsetX, .3);
  context.lineTo(.37 + offsetX, .9);
  context.closePath();
}

function _drawNextChapterIcon(context:CanvasRenderingContext2D) {
  _drawChapterArch(context, .2);
  context.moveTo(.05, .44);
  context.lineTo(.32, .44);
  context.lineTo(.32, .3);
  context.lineTo(.66, .52);
  context.lineTo(.32, .74);
  context.lineTo(.32, .6);
  context.lineTo(.05, .6);
}

function _drawControlPopover(label:string, rect:Rect, drawOffsetX:number, context:CanvasRenderingContext2D) {
  const padding = 8;
  const height = 24;
  const gap = 6;
  if (context.canvas.width <= 2 * padding + 2 || context.canvas.height < height + 2) return;
  context.save();
  context.font = '14px sans-serif';
  const width = Math.min(context.canvas.width - 2, Math.ceil(context.measureText(label).width) + 2 * padding);
  const centerX = rect.x + drawOffsetX + rect.width / 2;
  const left = Math.max(1, Math.min(centerX - width / 2, context.canvas.width - width - 1));
  const top = Math.max(1, rect.y - height - gap);
  context.fillStyle = BOOK_CONTROL_POPOVER_FILL;
  context.fillRect(left, top, width, height);
  context.strokeStyle = BOOK_CONTROL_POPOVER_BORDER;
  context.lineWidth = 1;
  context.strokeRect(left, top, width, height);
  context.fillStyle = BOOK_CONTROL_POPOVER_TEXT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, left + width / 2, top + height / 2, width - 2 * padding);
  context.restore();
}

function _drawBookControls(bookState:BookState, metaTime:number, context:CanvasRenderingContext2D, loadedLevelUrl:string|null) {
  const { layout } = bookState;
  assertNonNullable(layout);
  updateBookClaimControls(bookState, loadedLevelUrl);
  const drawOffsetX = calcPageViewOffsetX(bookState);
  context.save();
  context.fillStyle = 'white';
  context.globalAlpha = BOOK_CONTROL_ALPHA;
  for (const control of layout.controlLayout.controls) {
    if (!control.isVisible) continue;
    context.save();
    
    if (control.id === layout.controlLayout.hoveredControlId) context.fillStyle = 'yellow';
    
    context.translate(control.rect.x + drawOffsetX, control.rect.y);
    context.scale(control.rect.width, control.rect.height);
    context.beginPath();
    switch(control.id) {
      case 'closeBook': _drawCloseIcon(context); break;
      case 'nextPage': _drawRightArrow(context); break;
      case 'prevPage': _drawLeftArrow(context); break;
      case 'nextChapter': _drawNextChapterIcon(context); break;
      case 'visitChapter': _drawChapterArch(context, 0); break;
      case 'claim': _drawClaimHand(context); break;
      default: botch();
    }
    context.closePath();
    context.fill();
    context.restore();
  }
  context.restore();

  const { controlHoverStartedAt, controlLayout } = layout;
  if (bookState.pieceDragState !== null || controlHoverStartedAt === undefined
    || metaTime - controlHoverStartedAt < BOOK_CONTROL_POPOVER_DELAY_MS) return;
  const hovered = controlLayout.controls.find(control => control.isVisible && control.id === controlLayout.hoveredControlId);
  if (hovered) _drawControlPopover(BOOK_CONTROL_LABELS[hovered.id as BookControlId], hovered.rect, drawOffsetX, context);
}

function _drawPageContent(bookState:BookState, metaTime:number, bookDrawRect:Rect, imageSet:ImageSet,
  context:CanvasRenderingContext2D, presentations:readonly PieceSlotPresentation[]) {
  // Use displayed page rectangles; their single-page offset is already applied.
  const { layout } = bookState;
  assertNonNullable(layout);
  const isOnLeftPage = isLeftPageNo(bookState.pageNo);
  const leftPageNo = isOnLeftPage ? bookState.pageNo : bookState.pageNo - 1;
  const rightPageNo = isOnLeftPage ? bookState.pageNo + 1 : bookState.pageNo;
  const width = bookDrawRect.width / 2;
  const leftPageRect = { ...bookDrawRect, width};
  const rightPageRect = { ...bookDrawRect, x:bookDrawRect.x + width, width };

  // Collect only interactive pages, never animation previews or the hidden neighbor.
  const slots:PieceSlotLayout[] = [];
  const canCollect = bookState.isVisible && bookState.animationKind === null;
  const glints = prepareBookClaimGlints(bookState.claimState, metaTime);
  drawPage(bookState.pages[leftPageNo-1], metaTime, leftPageNo, leftPageRect, imageSet, context,
    canCollect && (!layout.isSinglePageView || isOnLeftPage) ? slots : null, presentations, glints,
    calcBookClaimMessageAlpha(bookState, bookState.pages[leftPageNo-1], metaTime));
  if (rightPageNo <= bookState.pages.length) {
    drawPage(bookState.pages[rightPageNo-1], metaTime, rightPageNo, rightPageRect, imageSet, context,
      canCollect && (!layout.isSinglePageView || !isOnLeftPage) ? slots : null, presentations, glints,
      calcBookClaimMessageAlpha(bookState, bookState.pages[rightPageNo-1], metaTime), bookState.pages[leftPageNo-1]);
  }

  // Replace rather than retain records from earlier page/content draws.
  layout.pieceSlotLayouts = slots;
  layout.pieceLayoutsPageNo = canCollect ? bookState.pageNo : null;
}

function _drawPieces(bookState:BookState, bookRect:Rect, metaTime:number, context:CanvasRenderingContext2D) {
  assertNonNullable(bookState.layout);
  // Collect both visible pages before drawing so pieces overlay all page content.
  const pieces = getVisibleBookPieces(bookState);
  const pieceLayouts = preparePieceLayouts(pieces, bookRect, context, bookState.pieceDragState);
  bookState.layout.pieceLayouts = bookState.animationKind === null ? pieceLayouts : [];
  bookState.layout.pieceLayoutsPageNo = bookState.animationKind === null ? bookState.pageNo : null;
  drawBookPieces(prepareBookClaimPieceFalls(pieceLayouts, bookState.claimState, metaTime,
    context.canvas.height), context, bookState);
}

export function drawBook(bookState:BookState, metaTime:number, imageSet:ImageSet, context:CanvasRenderingContext2D,
  reportStorageError:(error:unknown) => void, loadedLevelUrl:string|null = null) {
  assert(bookState.isVisible); // Prefer caller to check for readability.
  const bookImage = imageSet.findImage(BOOK_IMAGE_URL)?.image ?? null;
  assertNonNullable(bookImage);
  updateBookLayoutAsNeeded(context.canvas.width, context.canvas.height, bookImage, bookState);
  assertNonNullable(bookState.layout);
  const drawRect = calcBookDrawRect(bookState, metaTime);
  if (!bookState.isVisible) return; // Animations have hidden the book.
  const presentations = prepareBookPieceSlotPresentations(bookState, metaTime);
  _drawTranslucentBackground(bookState, metaTime, context);

  // Shake the book layers together without shifting normal geometry or persistent ejection positions.
  context.save();
  const claim = bookState.claimState;
  if (claim !== null) {
    context.translate(calcBookClaimShakeOffset(metaTime - claim.startedAt, claim.blanks.length,
      claim.correct, drawRect.height), 0);
  }
  _drawBookImage(bookImage, drawRect, bookState, metaTime, context);
  _drawPageContent(bookState, metaTime, drawRect, imageSet, context, presentations);
  updateBookClaim(bookState, metaTime, reportStorageError);
  _drawPieces(bookState, drawRect, metaTime, context);
  context.restore();

  // Navigation and overlays remain outside the claim transform, including the resumed recovery-end frame.
  drawPageFlip(bookState, metaTime, drawRect, bookImage, imageSet, context);
  if (bookState.animationKind === null) _drawBookControls(bookState, metaTime, context, loadedLevelUrl);
}