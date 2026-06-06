/* This module groups shared popover drawing helpers for room, character, and exit overlays.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { choosePopoverBoxRect } from "@/game/popoverLayoutUtil";

import Rect from "../types/Rect";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK, COLOR_POPOVER_FILL } from "./drawConstants";

type DrawTextPopoverOptions = {
  targetRect:Rect,
  title?:string,
  bodyTexts:string[],
  scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D
}

type PopoverTypographyAndSpacing = {
  titleFontSize:number,
  bodyFontSize:number,
  titleFont:string,
  bodyFont:string,
  padding:number,
  lineGap:number,
  maxTextWidth:number
}

type PopoverBoxLayout = {
  left:number,
  top:number,
  boxWidth:number,
  boxHeight:number,
  titleSectionHeight:number
}

function _createPopoverTypographyAndSpacing(scalingFactors:ScalingFactors, canvasWidth:number):PopoverTypographyAndSpacing {
  const titleFontSize = Math.max(20, Math.round(scalingFactors.roomFontHeight * 1.4));
  const bodyFontSize = Math.max(16, Math.round(scalingFactors.roomFontHeight * 1.0));
  return {
    titleFontSize,
    bodyFontSize,
    titleFont:`${titleFontSize}px Jellee`,
    bodyFont:`${bodyFontSize}px Jellee`,
    padding:Math.max(6, scalingFactors.roomLineWidth * 2),
    lineGap:Math.max(3, scalingFactors.roomLineWidth),
    maxTextWidth:Math.min(320, Math.max(140, canvasWidth * 0.35))
  };
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

function _createPopoverBodyLines(bodyTexts:string[], maxTextWidth:number, bodyFont:string, context:CanvasRenderingContext2D):string[] {
  return bodyTexts.flatMap((bodyText, index) => {
    const wrappedLines = _wrapText(context, bodyText, maxTextWidth, bodyFont);
    return index === 0 ? wrappedLines : ["", ...wrappedLines];
  });
}

function _measurePopoverBox(title:string, bodyLines:string[], targetRect:Rect,
  typographyAndSpacing:PopoverTypographyAndSpacing, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D):PopoverBoxLayout {
  const { titleFontSize, bodyFontSize, titleFont, bodyFont, padding, lineGap } = typographyAndSpacing;

  context.font = bodyFont;
  const bodyWidth = bodyLines.reduce((maxWidth, line) => Math.max(maxWidth, context.measureText(line).width), 0);
  context.font = titleFont;
  const titleWidth = title ? context.measureText(title).width : 0;
  const boxWidth = Math.max(titleWidth, bodyWidth) + padding * 2;
  const titleHeight = title ? titleFontSize : 0;
  const titleSectionHeight = title ? titleHeight + lineGap : 0;
  const bodyHeight = bodyLines.length * bodyFontSize + Math.max(0, bodyLines.length - 1) * lineGap;
  const boxHeight = padding * 2 + titleSectionHeight + bodyHeight;
  const { x:left, y:top } = choosePopoverBoxRect(
    targetRect, boxWidth, boxHeight, context.canvas.width, context.canvas.height, scalingFactors.roomLineWidth * 2);
  return {
    left,
    top,
    boxWidth,
    boxHeight,
    titleSectionHeight
  };
}

export function drawTextPopover({ targetRect, title = "", bodyTexts, scalingFactors, context }:DrawTextPopoverOptions) {
  const typographyAndSpacing = _createPopoverTypographyAndSpacing(scalingFactors, context.canvas.width);
  const { bodyFontSize, titleFont, bodyFont, padding, lineGap } = typographyAndSpacing;
  const bodyLines = _createPopoverBodyLines(bodyTexts, typographyAndSpacing.maxTextWidth, bodyFont, context);
  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  const { left, top, boxWidth, boxHeight, titleSectionHeight } = _measurePopoverBox(
    title, bodyLines, targetRect, typographyAndSpacing, scalingFactors, context);
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
