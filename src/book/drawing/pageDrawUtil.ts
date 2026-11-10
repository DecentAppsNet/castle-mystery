/* This file draws book page headings, page numbers, and temporary content-bound outlines.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "../types/BookPage";
import { isLeftPageNo } from "./bookLayoutUtil";

// All font sizes are based on percentages of targetRect's height.
const PAGE_HEADING_FONT_SIZE = .03;
const PAGE_NO_FONT_SIZE = .03;

const PAGE_OUTER_MARGIN = .12;
const PAGE_GUTTER_MARGIN = .05;
const PAGE_TOP_MARGIN = .04;
const PAGE_BOTTOM_MARGIN = .07;

// Use percentage-based margins to return an inner page rect representing the part of the page that will look
// visually correct to draw text over. In other words, we want to draw text over the flat paper part of the image -
// not the curved paper, the book cover, or the side of pages.
function _calcInnerPageRect(pageRect:Rect, pageNo:number):Rect {
  const isLeftPage = isLeftPageNo(pageNo);
  const leftMargin = isLeftPage ? PAGE_OUTER_MARGIN : PAGE_GUTTER_MARGIN;
  return {
    x:pageRect.x + pageRect.width * leftMargin,
    y:pageRect.y + pageRect.height * PAGE_TOP_MARGIN,
    width:pageRect.width * (1 - PAGE_OUTER_MARGIN - PAGE_GUTTER_MARGIN),
    height:pageRect.height * (1 - PAGE_TOP_MARGIN - PAGE_BOTTOM_MARGIN)
  };
}

export function drawPage(page:BookPage, pageNo:number, targetRect:Rect, context:CanvasRenderingContext2D) {
  const innerPageRect = _calcInnerPageRect(targetRect, pageNo);
  const centerX = innerPageRect.x + innerPageRect.width / 2;

  // Place text within the flat-paper bounds without leaking drawing state.
  context.fillStyle = '#392b20';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  if (page.headingText !== '') {
    context.font = `${targetRect.height * PAGE_HEADING_FONT_SIZE}px im-fell-english, serif`;
    context.fillText(page.headingText, centerX, innerPageRect.y, innerPageRect.width);
  }

  context.textBaseline = 'bottom';
  context.font = `${targetRect.height * PAGE_NO_FONT_SIZE}px im-fell-english, serif`;
  context.fillText('-' + pageNo + '-', centerX, innerPageRect.y + innerPageRect.height, innerPageRect.width);
  context.restore();
}