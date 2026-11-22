/* This file draws book start page titles, subtitles, dividers, and author credits.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import BookStartPage from "@/book/types/BookStartPage";
import PageWriter from "./PageWriter";

export function drawBookStartPage(page:BookStartPage, pw:PageWriter) {
  const aboveDividerTextHeight = pw.getTextLineHeight(page.title, 'xl') +
    (page.subtitle === null ? 0 : pw.getLineHeight('m'));
  const dividerHeight = pw.getLineHeight('l');

  pw.jump(0, 50 - aboveDividerTextHeight - (dividerHeight / 2));

  pw.setFontSize('xl');
  pw.addTextLine(page.title);
  if (page.subtitle) {
    pw.setFontSize('m');
    pw.addTextLine(page.subtitle);
  }
  pw.setFontSize('l');
  pw.addDivider('diamondCentered');
  pw.setFontSize('m');
  pw.addTextLine(`by ${page.author}`);
}