/* This file draws book page headings, page numbers, and temporary content-bound outlines.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import Rect from "@/game/types/Rect";
import BookPage from "../types/BookPage";
import { isLeftPageNo } from "./bookLayoutUtil";
import { assert, botch } from "decent-portal";
import PageWriter from "./PageWriter";
import ClozePartType from "@/game/conclusions/types/ClozePartType";
import ClozeText from "@/game/conclusions/types/ClozeText";

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

type BookStartPage = Extract<BookPage, { kind:'bookStart' }>;
function _drawBookStartPage(page:BookStartPage, pw:PageWriter) {
  pw.setFontSize('xl');
  pw.addTextLine(page.title);
  pw.setFontSize('m');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addTextLine(`by ${page.author}`);
  pw.setFontSize('m');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addLineBreak();
  pw.addText(page.description);
}

type ChapterStartPage = Extract<BookPage, { kind:'chapterStart' }>;
function _drawChapterStartPage(page:ChapterStartPage, pw:PageWriter) {
  pw.setFontSize('l');
  pw.addTextLine(page.title);
  pw.addDivider('diamondCentered');
}


type ConclusionPage = Extract<BookPage, { kind:'conclusion' }>;
function _drawConclusionPage(page:ConclusionPage, pw:PageWriter) {
  pw.setFontSize('m');
  for(let partI = 0; partI < page.conclusion.parts.length; ++partI) {
    const part = page.conclusion.parts[partI];
    switch(part.type) {
      case ClozePartType.blank:
        pw.addText('[ ]');
      break;

      case ClozePartType.image:
        // TODO
      break;

      case ClozePartType.separator:
        pw.addDivider('rule');
      break;

      case ClozePartType.text:
        pw.addText((part as ClozeText).text);
      break;

      default:
        botch();
    }
  }
}

function _drawLockedConclusionPage(_metaTime:number, _innerPageRect:Rect, _pageWriter:PageWriter, _context:CanvasRenderingContext2D) {
  // TODO
}

function _isLockedConclusionPage(page:BookPage) {
  return page.kind === 'conclusion' && page.conclusion.isLocked;
}

export function drawPage(page:BookPage, metaTime:number, pageNo:number, targetRect:Rect, context:CanvasRenderingContext2D) {
  const innerPageRect = _calcInnerPageRect(targetRect, pageNo);
  const pageWriter = new PageWriter(innerPageRect, context);

  // Place the heading and footer within the flat-paper bounds.
  pageWriter.setFontSize('s');
  if (page.headingText !== '') {
    pageWriter.addTextLine(_isLockedConclusionPage(page) ? 'Locked Conclusion' : page.headingText);
  } else {
    pageWriter.addLineBreak();
  }
  pageWriter.addLineBreak();

  switch(page.kind) {
    case 'bookStart': _drawBookStartPage(page, pageWriter); break;
    case 'chapterStart': _drawChapterStartPage(page, pageWriter); break;
    case 'conclusion': 
      if (_isLockedConclusionPage(page)) {
        _drawLockedConclusionPage(metaTime, innerPageRect, pageWriter, context);
      } else {
        _drawConclusionPage(page, pageWriter);
      }
      break;
    default:
      assert(page.kind === 'blank');
    break;
  }

  pageWriter.setFontSize('s');
  const lineHeight = pageWriter.getLineHeight();
  pageWriter.jump(0, 100 - lineHeight);
  pageWriter.addTextLine('-' + pageNo + '-');

}