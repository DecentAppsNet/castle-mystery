/* This file prepares authored flat animation spans and reports invalid speech markup as data.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { isTextAnimationName, segmentTextAnimation } from '@/game/textAnimations';
import { TextAnimationName } from '@/game/textAnimations/types/TextAnimationName';
import { TextAnimationSpan } from '@/game/textAnimations/types/TextAnimationSpan';
import { TextAnimationParseResult } from './types/TextAnimationParseResult';

export function parseTextAnimations(text:string):TextAnimationParseResult {
  let plainText = '';
  let cursorUtf16Offset = 0;
  let openSpan:{ name:TextAnimationName, startUtf16Offset:number, authoredUtf16Offset:number }|null = null;
  const spans:TextAnimationSpan[] = [];

  // Copy literal runs and record spans in visible-text coordinates.
  while (cursorUtf16Offset < text.length) {
    const startUtf16Offset = text.indexOf('[', cursorUtf16Offset);
    const endUtf16Offset = text.indexOf(']', cursorUtf16Offset);
    if (endUtf16Offset >= 0 && (startUtf16Offset < 0 || endUtf16Offset < startUtf16Offset)) {
      return { success:false, message:'Unmatched text animation closing bracket.', utf16Offset:endUtf16Offset };
    }
    if (startUtf16Offset < 0) break;
    if (endUtf16Offset < 0) {
      return { success:false, message:'Missing text animation closing bracket.', utf16Offset:startUtf16Offset };
    }
    plainText += text.slice(cursorUtf16Offset, startUtf16Offset);
    const name = text.slice(startUtf16Offset + 1, endUtf16Offset);
    if (name === '/') {
      if (!openSpan) return { success:false, message:'Unmatched text animation closing tag.', utf16Offset:startUtf16Offset };
      const spanText = plainText.slice(openSpan.startUtf16Offset);
      spans.push({ name:openSpan.name, startUtf16Offset:openSpan.startUtf16Offset,
        endUtf16Offset:plainText.length, text:spanText, graphemes:segmentTextAnimation(spanText) });
      openSpan = null;
    } else {
      if (!isTextAnimationName(name)) {
        return { success:false, message:`Unknown text animation "${name}".`, utf16Offset:startUtf16Offset };
      }
      if (openSpan) return { success:false, message:'Nested text animation spans are invalid.', utf16Offset:startUtf16Offset };
      openSpan = { name, startUtf16Offset:plainText.length, authoredUtf16Offset:startUtf16Offset };
    }
    cursorUtf16Offset = endUtf16Offset + 1;
  }

  // Preserve the final literal run and reject any unfinished span.
  plainText += text.slice(cursorUtf16Offset);
  if (openSpan) {
    return { success:false, message:`Unclosed text animation "${openSpan.name}".`, utf16Offset:openSpan.authoredUtf16Offset };
  }
  return { success:true, preparedText:{ plainText, spans } };
}