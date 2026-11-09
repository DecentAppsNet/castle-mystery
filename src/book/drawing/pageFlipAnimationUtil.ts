/* This file provides temporary book page-flip preview animation helpers.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Visual animation preview glue is verified manually. @preserve */

import BookState from "../types/BookState";
import Rect from "@/game/types/Rect";
import { clamp, interpolateNumber } from "@/common/numberUtil";
import { getAnimationProgress } from "./bookAnimationUtil";

const PAGE_FLIP_ANIMATION_DURATION = 200;
const PAPER_HORIZONTAL_INSET = .055;
const PAPER_TOP_INSET = .05;
const PAPER_BOTTOM_INSET = .055;
const BULGE_HEIGHT_RATIO = .266;
const OUTLINE_WIDTH_RATIO = .0038;
const SHAPE_KEYS = [
  { time:0, tip:1, bulge:0 },
  { time:.19, tip:.78, bulge:.16 },
  { time:.40, tip:.28, bulge:.36 },
  { time:.56, tip:-.28, bulge:.40 },
  { time:.81, tip:-.82, bulge:.17 },
  { time:1, tip:-1, bulge:0 }
];

function _shapeAt(progress:number, direction:-1|1) {
  let keyIndex = 0;
  while (keyIndex < SHAPE_KEYS.length - 2 && progress > SHAPE_KEYS[keyIndex + 1].time) keyIndex++;
  const from = SHAPE_KEYS[keyIndex];
  const to = SHAPE_KEYS[keyIndex + 1];
  const phaseProgress = clamp((progress - from.time) / (to.time - from.time), 0, 1);
  const easedProgress = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
  return {
    tip:interpolateNumber(from.tip, to.tip, easedProgress) * direction,
    bulge:interpolateNumber(from.bulge, to.bulge, easedProgress)
  };
}

function _leafPath(tip:number, bulge:number, drawRect:Rect, context:CanvasRenderingContext2D) {
  const spine = drawRect.x + drawRect.width / 2;
  const top = drawRect.y + drawRect.height * PAPER_TOP_INSET;
  const bottom = drawRect.y + drawRect.height * (1 - PAPER_BOTTOM_INSET);
  const tipX = spine + tip * drawRect.width * (.5 - PAPER_HORIZONTAL_INSET);
  const wave = bulge * drawRect.height * BULGE_HEIGHT_RATIO;
  const side = Math.sign(tip) || 1;

  // The attachment edge stays on the spine while the free edge crosses it.
  context.beginPath();
  context.moveTo(spine, top);
  context.bezierCurveTo(interpolateNumber(spine, tipX, .30), top - wave * .22,
    interpolateNumber(spine, tipX, .78), top - wave, tipX, top + wave * .17);
  context.bezierCurveTo(tipX + side * wave * .55, interpolateNumber(top, bottom, .27),
    tipX - side * wave * .12, interpolateNumber(top, bottom, .75), tipX, bottom - wave * .22);
  context.bezierCurveTo(interpolateNumber(spine, tipX, .73), bottom + wave * .32,
    interpolateNumber(spine, tipX, .28), bottom + wave * .11, spine, bottom);
  context.closePath();
}

export function drawPageFlipPreview(bookState:BookState, metaTime:number, drawRect:Rect, context:CanvasRenderingContext2D) {
  if (bookState.animationKind !== 'flipPrev' && bookState.animationKind !== 'flipNext') return;
  const progress = getAnimationProgress(bookState, metaTime);
  if (progress <= 0 || progress >= 1) return;
  const shape = _shapeAt(progress, bookState.animationKind === 'flipNext' ? 1 : -1);

  // Use canvas coordinates so later texture filling can remain stationary.
  context.save();
  _leafPath(shape.tip, shape.bulge, drawRect, context);
  context.strokeStyle = '#8c6841';
  context.lineWidth = drawRect.width * OUTLINE_WIDTH_RATIO;
  context.lineJoin = 'round';
  context.stroke();
  context.restore();
}

export function startPageFlipPreview(metaTime:number, bookState:BookState, kind:'flipPrev'|'flipNext') {
  if (!bookState.isVisible || !bookState.layout || bookState.animationKind !== null) return;

  bookState.animationKind = kind;
  bookState.animationStartMetaTime = metaTime;
  bookState.animationDuration = PAGE_FLIP_ANIMATION_DURATION;
  bookState.onAnimationEnd = null;
}