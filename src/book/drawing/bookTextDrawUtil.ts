/* This file provides shared font, text sizing, and bordered text drawing for book pages and loose pieces.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */
/* v8 ignore file -- Canvas text sizing and drawing are verified visually. @preserve */

import Point from "@/game/types/Point";
import Rect from "@/game/types/Rect";
import PageTextBoxMetrics from "./types/PageTextBoxMetrics";

export function bookCanvasFont(fontSizePixels:number) {
  return `${fontSizePixels}px im-fell-english, serif`;
}

export function measureBookTextBox(text:string, pageWidth:number, lineHeight:number,
    context:CanvasRenderingContext2D, initialFontSizePixels:number = lineHeight):PageTextBoxMetrics {
  const padding = lineHeight * .15;
  let fontSizePixels = initialFontSizePixels;
  context.save();
  context.font = bookCanvasFont(fontSizePixels);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  let textWidth = context.measureText(text).width;
  const maxTextWidth = Math.max(pageWidth - padding * 2, pageWidth * .1);
  if (textWidth > maxTextWidth) {
    fontSizePixels *= maxTextWidth / textWidth;
    context.font = bookCanvasFont(fontSizePixels);
    textWidth = context.measureText(text).width;
  }
  const width = text === '' ? pageWidth * .1 : textWidth + padding * 2;
  context.restore();
  return { width, padding, fontSizePixels };
}

export function drawBorderedBookText(text:string, rect:Rect, polygon:ReadonlyArray<Point>,
    padding:number, fontSizePixels:number, colorHex:string, backgroundColor:string | null,
    context:CanvasRenderingContext2D):void {
  const borderPath = new Path2D();
  borderPath.moveTo(polygon[0][0], polygon[0][1]);
  for (const [pointX, pointY] of polygon.slice(1)) borderPath.lineTo(pointX, pointY);
  borderPath.closePath();

  // Fill and outline the piece border independently of the caller's canvas state.
  context.save();
  context.font = bookCanvasFont(fontSizePixels);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  if (backgroundColor !== null) {
    context.fillStyle = backgroundColor;
    context.fill(borderPath);
  }
  context.strokeStyle = colorHex;
  context.lineWidth = rect.height * .035;
  context.setLineDash([]);
  context.stroke(borderPath);
  if (text !== '') {
    context.fillStyle = colorHex;
    context.fillText(text, rect.x + padding, rect.y + (rect.height - fontSizePixels) / 2);
  }
  context.restore();
}