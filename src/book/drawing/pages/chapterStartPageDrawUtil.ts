/* This file draws chapter start page numbers, titles, dividers, and descriptions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import ChapterStartPage from "@/book/types/ChapterStartPage";
import PageWriter from "./PageWriter";
import { toNumeral } from "@/common/romanNumeralUtil";

export function drawChapterStartPage(page:ChapterStartPage, pw:PageWriter) {
  const aboveDividerTextHeight = pw.getLineHeight('l') + pw.getTextLineHeight(page.title, 'l');
  const dividerHeight = pw.getLineHeight('m');

  pw.jump(0, 50 - aboveDividerTextHeight - (dividerHeight / 2));

  pw.setFontSize('l');
  pw.addTextLine(`Chapter ${toNumeral(page.chapterNo)}`);
  pw.addTextLine(page.title);
  pw.setFontSize('m');
  pw.addDivider('rule');
  pw.addIlluminatedText(page.description);
}