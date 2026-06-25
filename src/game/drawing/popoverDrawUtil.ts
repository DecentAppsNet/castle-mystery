/* This module groups shared popover drawing helpers for room, character, and exit overlays.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import CanvasLayoutPlanner from "@/game/CanvasLayoutPlanner";
import { choosePopoverBoxRect } from "@/game/popoverLayoutUtil";

import ImageSet from "../types/ImageSet";
import Rect from "../types/Rect";
import ScalingFactors from "../types/ScalingFactors";
import { COLOR_BLACK, COLOR_POPOVER_FILL } from "./drawColorConstants";

export type PopoverBodyEntry =
  | { type:'text', text:string }
  | { type:'separator' }
  | { type:'imageTextRow', imageUrl:string, text:string, isDescriptionOnly?:boolean };

type DrawTextPopoverOptions = {
  targetRect:Rect,
  title?:string,
  bodyTexts:string[],
  scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D,
  layoutPlanner?:CanvasLayoutPlanner|null
}

type DrawPopoverOptions = {
  targetRect:Rect,
  title?:string,
  bodyEntries:PopoverBodyEntry[],
  scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D,
  imageSet?:ImageSet,
  layoutPlanner?:CanvasLayoutPlanner|null
}

type PopoverTypographyAndSpacing = {
  titleFontSize:number,
  bodyFontSize:number,
  itemDescriptionFontSize:number,
  titleFont:string,
  bodyFont:string,
  itemDescriptionFont:string,
  padding:number,
  lineGap:number,
  titleBodyGap:number,
  maxTextWidth:number,
  imageColumnGap:number,
  imageColumnWidthRatio:number,
  fallbackImageAspectRatio:number,
  separatorWidthRatio:number
}

type PopoverBoxLayout = {
  left:number,
  top:number,
  boxWidth:number,
  boxHeight:number,
  titleSectionHeight:number,
  contentWidth:number
}

type WrappedPopoverRow =
  | { type:'text', lines:string[] }
  | { type:'separator', rowHeight:number, lineWidth:number }
  | { type:'imageTextRow', titleLines:string[], descriptionLines:string[], imageUrl:string, imageWidth:number, imageHeight:number, textWidth:number, rowHeight:number };

type VisibleImageSourceRect = {
  sx:number,
  sy:number,
  sw:number,
  sh:number,
  aspectRatio:number
};

const SEPARATOR_WIDTH_RATIO = 0.25;
const ITEM_DESCRIPTION_FONT_SIZE_RATIO = 0.75;
const IMAGE_ALPHA_THRESHOLD = 16;

const _visibleImageSourceRectCache = new WeakMap<ImageBitmap, VisibleImageSourceRect>();

function _drawPopoverConnectorLine(targetRect:Rect, boxLayout:PopoverBoxLayout,
  scalingFactors:ScalingFactors, context:CanvasRenderingContext2D) {
  const anchorCenterX = targetRect.x + targetRect.width / 2;
  const popoverLeft = boxLayout.left;
  const popoverRight = boxLayout.left + boxLayout.boxWidth;
  const fromX = anchorCenterX < popoverLeft
    ? popoverLeft
    : anchorCenterX > popoverRight
      ? popoverRight
      : anchorCenterX;
  const fromY = boxLayout.top + boxLayout.boxHeight;
  const toX = anchorCenterX;
  const toY = targetRect.y;
  context.save();
  context.strokeStyle = COLOR_BLACK;
  context.lineWidth = scalingFactors.roomLineWidth * 0.2;
  context.setLineDash([4, 3]);
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.restore();
}

function _createPopoverTypographyAndSpacing(scalingFactors:ScalingFactors, canvasWidth:number):PopoverTypographyAndSpacing {
  const titleFontSize = Math.max(20, Math.round(scalingFactors.roomFontHeight * 1.4));
  const bodyFontSize = Math.max(16, Math.round(scalingFactors.roomFontHeight * 1.0));
  const itemDescriptionFontSize = Math.max(12, Math.round(bodyFontSize * ITEM_DESCRIPTION_FONT_SIZE_RATIO));
  const lineGap = 3;
  return {
    titleFontSize,
    bodyFontSize,
    itemDescriptionFontSize,
    titleFont:`${titleFontSize}px Jellee`,
    bodyFont:`${bodyFontSize}px Jellee`,
    itemDescriptionFont:`${itemDescriptionFontSize}px Jellee`,
    padding:Math.max(6, scalingFactors.roomLineWidth * 2),
    lineGap,
    titleBodyGap:Math.max(8, bodyFontSize * 0.35),
    maxTextWidth:Math.min(320, Math.max(140, canvasWidth * 0.35)),
    imageColumnGap:Math.max(6, scalingFactors.roomLineWidth * 2),
    imageColumnWidthRatio:0.2,
    fallbackImageAspectRatio:1,
    separatorWidthRatio:SEPARATOR_WIDTH_RATIO
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

function _splitPopoverBodyTextIntoAuthoredLines(bodyText:string):string[] {
  return bodyText.split('|').map(line => line.trim());
}

function _createTextRowLines(bodyText:string, maxTextWidth:number, bodyFont:string, context:CanvasRenderingContext2D):string[] {
  return _splitPopoverBodyTextIntoAuthoredLines(bodyText)
    .flatMap(line => _wrapText(context, line, maxTextWidth, bodyFont));
}

function _createImageTextRowLines(bodyText:string, maxTextWidth:number,
  bodyFont:string, itemDescriptionFont:string, context:CanvasRenderingContext2D):{ titleLines:string[], descriptionLines:string[] } {
  const [titleText = "", ...descriptionTexts] = _splitPopoverBodyTextIntoAuthoredLines(bodyText);
  const titleLines = _wrapText(context, titleText, maxTextWidth, bodyFont);
  const descriptionLines = descriptionTexts.flatMap(line => _wrapText(context, line, maxTextWidth, itemDescriptionFont));
  return { titleLines, descriptionLines };
}

function _createDescriptionOnlyImageTextRowLines(bodyText:string, maxTextWidth:number,
  itemDescriptionFont:string, context:CanvasRenderingContext2D):string[] {
  return _splitPopoverBodyTextIntoAuthoredLines(bodyText)
    .flatMap(line => _wrapText(context, line, maxTextWidth, itemDescriptionFont));
}

function _findImageAspectRatio(imageUrl:string, imageSet:ImageSet|undefined, fallbackAspectRatio:number):number {
  const image = imageSet?.get(imageUrl) || null;
  if (!image || image.width <= 0 || image.height <= 0) return fallbackAspectRatio;
  return _findVisibleImageSourceRect(image)?.aspectRatio ?? image.height / image.width;
}

function _createImageAnalysisCanvas(image:ImageBitmap):HTMLCanvasElement|null {
  if (typeof document === 'undefined' || image.width <= 0 || image.height <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  return canvas;
}

function _findVisibleImageSourceRect(image:ImageBitmap):VisibleImageSourceRect|null {
  const cachedRect = _visibleImageSourceRectCache.get(image) || null;
  if (cachedRect) return cachedRect;

  const canvas = _createImageAnalysisCanvas(image);
  if (!canvas) return null;
  const context = canvas.getContext('2d', { willReadFrequently:true });
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < IMAGE_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const visibleRect = {
    sx:minX,
    sy:minY,
    sw:maxX - minX + 1,
    sh:maxY - minY + 1,
    aspectRatio:(maxY - minY + 1) / (maxX - minX + 1)
  };
  _visibleImageSourceRectCache.set(image, visibleRect);
  return visibleRect;
}

function _createWrappedPopoverRows(bodyEntries:PopoverBodyEntry[], typographyAndSpacing:PopoverTypographyAndSpacing,
  context:CanvasRenderingContext2D, imageSet:ImageSet|undefined, contentWidth:number = typographyAndSpacing.maxTextWidth):WrappedPopoverRow[] {
  return bodyEntries.map(entry => {
    if (entry.type === 'text') {
      return {
        type:'text',
        lines:_createTextRowLines(entry.text, contentWidth, typographyAndSpacing.bodyFont, context)
      };
    }
    if (entry.type === 'separator') {
      const lineHeight = typographyAndSpacing.bodyFontSize + typographyAndSpacing.lineGap;
      const borderLineWidth = Math.max(1, typographyAndSpacing.lineGap);
      const lineWidth = Math.max(1, borderLineWidth * typographyAndSpacing.separatorWidthRatio);
      return {
        type:'separator',
        rowHeight:lineHeight,
        lineWidth
      };
    }

  const imageWidth = contentWidth * typographyAndSpacing.imageColumnWidthRatio;
  const textWidth = contentWidth - imageWidth - typographyAndSpacing.imageColumnGap;
    const titleLines = entry.isDescriptionOnly
      ? []
      : _createImageTextRowLines(
        entry.text,
        textWidth,
        typographyAndSpacing.bodyFont,
        typographyAndSpacing.itemDescriptionFont,
        context
      ).titleLines;
    const descriptionLines = entry.isDescriptionOnly
      ? _createDescriptionOnlyImageTextRowLines(
        entry.text,
        textWidth,
        typographyAndSpacing.itemDescriptionFont,
        context
      )
      : _createImageTextRowLines(
        entry.text,
        textWidth,
        typographyAndSpacing.bodyFont,
        typographyAndSpacing.itemDescriptionFont,
        context
      ).descriptionLines;
    const imageHeight = imageWidth * _findImageAspectRatio(entry.imageUrl, imageSet, typographyAndSpacing.fallbackImageAspectRatio);
    const titleHeight = titleLines.length * typographyAndSpacing.bodyFontSize
      + Math.max(0, titleLines.length - 1) * typographyAndSpacing.lineGap;
    const descriptionHeight = descriptionLines.length * typographyAndSpacing.itemDescriptionFontSize
      + Math.max(0, descriptionLines.length - 1) * typographyAndSpacing.lineGap;
    const textHeight = titleHeight + (titleLines.length && descriptionLines.length ? typographyAndSpacing.lineGap : 0) + descriptionHeight;
    return {
      type:'imageTextRow',
      titleLines,
      descriptionLines,
      imageUrl:entry.imageUrl,
      imageWidth,
      imageHeight,
      textWidth,
      rowHeight:Math.max(imageHeight, textHeight)
    };
  });
}

function _measurePopoverBox(title:string, bodyRows:WrappedPopoverRow[], targetRect:Rect,
  typographyAndSpacing:PopoverTypographyAndSpacing, scalingFactors:ScalingFactors,
  context:CanvasRenderingContext2D, layoutPlanner:CanvasLayoutPlanner|null = null):PopoverBoxLayout {
  const { titleFontSize, titleFont, bodyFont, padding, lineGap, titleBodyGap, imageColumnGap } = typographyAndSpacing;

  context.font = bodyFont;
  const bodyWidth = bodyRows.reduce((maxWidth, row) => {
    if (row.type === 'text') {
      return Math.max(maxWidth, ...row.lines.map(line => context.measureText(line).width), 0);
    }
    if (row.type === 'separator') return maxWidth;
    context.font = typographyAndSpacing.bodyFont;
    const titleWidth = Math.max(...row.titleLines.map(line => context.measureText(line).width), 0);
    context.font = typographyAndSpacing.itemDescriptionFont;
    const descriptionWidth = Math.max(...row.descriptionLines.map(line => context.measureText(line).width), 0);
    const measuredTextWidth = Math.max(titleWidth, descriptionWidth);
    const reservedRowWidth = row.imageWidth + imageColumnGap + row.textWidth;
    return Math.max(maxWidth, reservedRowWidth, row.imageWidth + imageColumnGap + measuredTextWidth);
  }, 0);
  context.font = titleFont;
  const titleWidth = title ? context.measureText(title).width : 0;
  const boxWidth = Math.max(titleWidth, bodyWidth) + padding * 2;
  const titleHeight = title ? titleFontSize : 0;
  const titleSectionHeight = title ? titleHeight + titleBodyGap : 0;
  const bodyHeight = bodyRows.reduce((height, row, index) => {
    const rowHeight = row.type === 'text'
      ? row.lines.length * typographyAndSpacing.bodyFontSize + Math.max(0, row.lines.length - 1) * lineGap
      : row.type === 'separator'
        ? row.rowHeight
      : row.rowHeight;
    return height + rowHeight + (index === 0 ? 0 : lineGap);
  }, 0);
  const boxHeight = padding * 2 + titleSectionHeight + bodyHeight;
  const borderWidth = Math.max(1, scalingFactors.roomLineWidth);
  const borderOverflow = borderWidth / 2;
  const outerBoxRect = layoutPlanner
    ? layoutPlanner.findBestPopoverRect(targetRect, boxWidth + borderWidth, boxHeight + borderWidth)
    : choosePopoverBoxRect(targetRect, boxWidth + borderWidth, boxHeight + borderWidth,
      context.canvas.width, context.canvas.height, scalingFactors.roomLineWidth * 2);
  const left = outerBoxRect.x + borderOverflow;
  const top = outerBoxRect.y + borderOverflow;
  return {
    left,
    top,
    boxWidth,
    boxHeight,
    titleSectionHeight,
    contentWidth:boxWidth - padding * 2
  };
}

export function drawTextPopover({ targetRect, title = "", bodyTexts, scalingFactors, context, layoutPlanner = null }:DrawTextPopoverOptions) {
  drawPopover({
    targetRect,
    title,
    bodyEntries:bodyTexts.map(text => ({ type:'text', text } as PopoverBodyEntry)),
    scalingFactors,
    context,
    layoutPlanner
  });
}

export function drawPopover({ targetRect, title = "", bodyEntries, scalingFactors, context, imageSet, layoutPlanner = null }:DrawPopoverOptions) {
  const typographyAndSpacing = _createPopoverTypographyAndSpacing(scalingFactors, context.canvas.width);
  const { bodyFontSize, itemDescriptionFontSize, titleFont, bodyFont, itemDescriptionFont, padding, lineGap } = typographyAndSpacing;
  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  const initialBodyRows = _createWrappedPopoverRows(bodyEntries, typographyAndSpacing, context, imageSet);
  const initialBoxLayout = _measurePopoverBox(
    title, initialBodyRows, targetRect, typographyAndSpacing, scalingFactors, context, layoutPlanner);
  const bodyRows = initialBoxLayout.contentWidth > typographyAndSpacing.maxTextWidth
    ? _createWrappedPopoverRows(bodyEntries, typographyAndSpacing, context, imageSet, initialBoxLayout.contentWidth)
    : initialBodyRows;
  const boxLayout = bodyRows === initialBodyRows
    ? initialBoxLayout
    : _measurePopoverBox(title, bodyRows, targetRect, typographyAndSpacing, scalingFactors, context, layoutPlanner);
  const { left, top, boxWidth, boxHeight, titleSectionHeight } = boxLayout;
  _drawPopoverConnectorLine(targetRect, boxLayout, scalingFactors, context);
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
  let rowTop = top + padding + titleSectionHeight;
  bodyRows.forEach((row, index) => {
    if (index > 0) rowTop += lineGap;
    if (row.type === 'text') {
      let lineTop = rowTop;
      row.lines.forEach(line => {
        if (line) context.fillText(line, left + padding, lineTop);
        lineTop += bodyFontSize + lineGap;
      });
      rowTop = lineTop - lineGap;
      return;
    }
    if (row.type === 'separator') {
      const separatorY = rowTop + row.rowHeight / 2;
      context.save();
      context.strokeStyle = COLOR_BLACK;
      context.lineWidth = row.lineWidth;
      context.beginPath();
      context.moveTo(left, separatorY);
      context.lineTo(left + boxWidth, separatorY);
      context.stroke();
      context.restore();
      rowTop += row.rowHeight;
      return;
    }

    const image = imageSet?.get(row.imageUrl) || null;
    const imageLeft = left + padding;
    const imageTop = rowTop;
    const textLeft = imageLeft + row.imageWidth + typographyAndSpacing.imageColumnGap;
    if (image) {
      const sourceRect = _findVisibleImageSourceRect(image);
      if (sourceRect) {
        context.drawImage(image,
          sourceRect.sx, sourceRect.sy, sourceRect.sw, sourceRect.sh,
          imageLeft, imageTop, row.imageWidth, row.imageHeight);
      } else {
        context.drawImage(image, imageLeft, imageTop, row.imageWidth, row.imageHeight);
      }
    }
    let lineTop = rowTop;
    context.font = bodyFont;
    row.titleLines.forEach(line => {
      if (line) context.fillText(line, textLeft, lineTop);
      lineTop += bodyFontSize + lineGap;
    });
    context.font = itemDescriptionFont;
    row.descriptionLines.forEach(line => {
      if (line) context.fillText(line, textLeft, lineTop);
      lineTop += itemDescriptionFontSize + lineGap;
    });
    context.font = bodyFont;
    rowTop += row.rowHeight;
  });
  context.restore();
}
