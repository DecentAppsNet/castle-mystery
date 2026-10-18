/* This file draws bubble text with fixed resting positions and optional per-grapheme animation transforms.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { calcTextAnimationTransform } from '@/game/textAnimations';
import { PreparedAnimationText } from '@/game/textAnimations/types/PreparedAnimationText';

export function drawBubbleText(text:PreparedAnimationText, centerX:number, baselineY:number,
    metaTime:number, context:CanvasRenderingContext2D):void {
  if (!text.spans.length) {
    context.fillText(text.plainText, centerX, baselineY);
    return;
  }
  const width = context.measureText(text.plainText).width;
  const left = centerX - width / 2;
  const restingX = (utf16Offset:number) => left + width - context.measureText(text.plainText.slice(utf16Offset)).width;
  let cursorUtf16Offset = 0;
  context.save();
  context.textAlign = 'left';

  for (const span of text.spans) {
    const unmarked = text.plainText.slice(cursorUtf16Offset, span.startUtf16Offset);
    if (unmarked) context.fillText(unmarked, restingX(cursorUtf16Offset), baselineY);
    let letterUtf16Offset = span.startUtf16Offset;
    for (const [letterI, letter] of span.graphemes.entries()) {
      const letterX = restingX(letterUtf16Offset);
      letterUtf16Offset += letter.length;
      if (!letter.trim()) continue;
      const metrics = context.measureText(letter);
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const centerYOffset = (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2;
      const transform = calcTextAnimationTransform(span.name, span.text, letterI, metaTime);
      context.save();
      context.translate(letterX + metrics.width / 2 + (transform.translateXFraction ?? 0) * metrics.width,
        baselineY + centerYOffset + (transform.translateYFraction ?? 0) * height);
      context.rotate(transform.rotateOffset ?? 0);
      context.scale(transform.scaleAmount ?? 1, transform.scaleAmount ?? 1);
      context.fillText(letter, -metrics.width / 2, -centerYOffset);
      context.restore();
    }
    cursorUtf16Offset = span.endUtf16Offset;
  }

  const trailing = text.plainText.slice(cursorUtf16Offset);
  if (trailing) context.fillText(trailing, restingX(cursorUtf16Offset), baselineY);
  context.restore();
}