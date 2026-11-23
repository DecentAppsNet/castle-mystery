/* This file draws chapter conclusion tallies and shame marks.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas page layout and text rendering are verified visually. @preserve */

import TallyPage from "@/book/types/TallyPage";
import PageWriter from "./PageWriter";
import { toEnglishNumber } from "@/common/numberTextUtil";
import { countRemainingRequiredConclusions, countShameMarks } from '@/book/claiming';

export function drawTallyPage(page:TallyPage, pw:PageWriter) {
  pw.setFontSize('l');
  pw.addDivider();
  pw.addTextLine('Conclusions');
  pw.addDivider();
  pw.setFontSize('m');
  const remainingCount = countRemainingRequiredConclusions(page.conclusions);
  if (remainingCount === 0) {
    pw.addTextLine('All conclusions for this chapter have been claimed.\nYou may visit the next chapter now.');
  } else {
    const remainingCountText = toEnglishNumber(remainingCount);
    const conclusionsText = remainingCount === 1 ? 'conclusion' : 'conclusions';
    pw.addTextLine(`You must claim ${remainingCountText} more ${conclusionsText}\nto continue in this book.`);
  }
  pw.addLineBreak();
  pw.setFontSize('l');
  pw.addDivider();
  pw.addTextLine('Marks of Shame');
  pw.addDivider();
  pw.setFontSize('m');
  const shameMarkCount = countShameMarks(page.conclusions);
  if (shameMarkCount === 0) {
    pw.addTextLine('You bear no marks of shame\nfrom this chapter.');
  } else {
    const shameMarkCountText = toEnglishNumber(shameMarkCount);
    pw.addTextLine('Your false claims\nin this chapter have brought');
    pw.setFontSize('xl');
    pw.addTextLine(shameMarkCountText, 'center', 'red');
    pw.setFontSize('m');
    const marksText = shameMarkCount === 1 ? 'mark' : 'marks';
    pw.addTextLine(`${marksText} of shame\nfor which you will atone later.`);
  }
}