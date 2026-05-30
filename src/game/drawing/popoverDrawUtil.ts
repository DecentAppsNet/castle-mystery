import { clamp } from "@/common/numberUtil";

import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK, COLOR_POPOVER_FILL } from "./drawConstants";

type DrawTextPopoverOptions = {
  anchorX:number,
  anchorY:number,
  title?:string,
  bodyTexts:string[],
  scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D
}

function _wrapText(context:CanvasRenderingContext2D, text:string, maxWidth:number, font:string):string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  context.save();
  context.font = font;
  const lines:string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; ++i) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (context.measureText(nextLine).width <= maxWidth) currentLine = nextLine;
    else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  context.restore();
  return lines;
}

export function drawTextPopover({ anchorX, anchorY, title = "", bodyTexts, scalingFactors, context }:DrawTextPopoverOptions) {
  const canvasRight = context.canvas.width;
  const canvasBottom = context.canvas.height;
  const titleFontSize = Math.max(20, Math.round(scalingFactors.roomFontHeight * 1.4));
  const bodyFontSize = Math.max(16, Math.round(scalingFactors.roomFontHeight * 1.0));
  const bodyFont = `${bodyFontSize}px Jellee`;
  const titleFont = `${titleFontSize}px Jellee`;
  const padding = Math.max(6, scalingFactors.roomLineWidth * 2);
  const lineGap = Math.max(3, scalingFactors.roomLineWidth);
  const maxTextWidth = Math.min(320, Math.max(140, canvasRight * 0.35));
  const bodyLines = bodyTexts.flatMap((bodyText, index) => {
    const wrappedLines = _wrapText(context, bodyText, maxTextWidth, bodyFont);
    return index === 0 ? wrappedLines : ["", ...wrappedLines];
  });
  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = bodyFont;
  const bodyWidth = bodyLines.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0);
  context.font = titleFont;
  const titleWidth = title ? context.measureText(title).width : 0;
  const boxWidth = Math.max(titleWidth, bodyWidth) + padding * 2;
  const titleHeight = title ? titleFontSize : 0;
  const titleSectionHeight = title ? titleHeight + lineGap : 0;
  const bodyHeight = bodyLines.length * bodyFontSize + Math.max(0, bodyLines.length - 1) * lineGap;
  const boxHeight = padding * 2 + titleSectionHeight + bodyHeight;
  const desiredLeft = anchorX + scalingFactors.roomLineWidth * 2;
  const desiredTop = anchorY - boxHeight - scalingFactors.roomLineWidth * 2;
  const left = clamp(desiredLeft, 0, canvasRight - boxWidth);
  const top = clamp(desiredTop, 0, canvasBottom - boxHeight);
  context.fillStyle = COLOR_POPOVER_FILL;
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = Math.max(1, scalingFactors.roomLineWidth);
  context.fillRect(left, top, boxWidth, boxHeight);
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.fillStyle = COLOR_BLACK;
  if (title) {
    context.font = titleFont;
    context.fillText(title, left + padding, top + padding);
  }
  context.font = bodyFont;
  let lineTop = top + padding + titleSectionHeight;
  bodyLines.forEach(line => {
    if (line) context.fillText(line, left + padding, lineTop);
    lineTop += bodyFontSize + lineGap;
  });
  context.restore();
}
