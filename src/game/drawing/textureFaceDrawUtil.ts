import { applyTextureModifiers } from "@/game/imageFilters/imageFilterUtil";
import { findTexturePrimaryImageOperation, isTextureFilterOperation, isTextureImageOperation } from "@/game/textureUtil";

import ImageSet from "../types/ImageSet";
import Texture from "../types/Texture";
import TextureImageOperation from "../types/TextureImageOperation";
import { calcTextureFaceSize } from "../textureSizingUtil";
import { createScratchCanvas } from "./canvasSurfaceUtil";

export type TextureFaceImage = Readonly<{
  image:CanvasImageSource,
  width:number,
  height:number
}>;

function _traceClosedPolygon(points:Array<[number, number]>, context:CanvasRenderingContext2D) {
  context.moveTo(...points[0]);
  for (let pointIndex = 1; pointIndex < points.length; ++pointIndex) {
    context.lineTo(...points[pointIndex]);
  }
  context.closePath();
}

export function drawClippedTransformedTextureFace(faceImage:TextureFaceImage, origin:[number, number],
  horizontalVector:[number, number], verticalVector:[number, number], points:Array<[number, number]>,
  context:CanvasRenderingContext2D, cutoutPoints:Array<Array<[number, number]>> = []) {
  context.save();
  context.beginPath();
  _traceClosedPolygon(points, context);
  cutoutPoints.forEach(cutout => _traceClosedPolygon(cutout, context));
  context.clip(cutoutPoints.length ? 'evenodd' : 'nonzero');
  context.transform(
    horizontalVector[0] / faceImage.width,
    horizontalVector[1] / faceImage.width,
    verticalVector[0] / faceImage.height,
    verticalVector[1] / faceImage.height,
    origin[0],
    origin[1]
  );
  context.drawImage(faceImage.image, 0, 0);
  context.restore();
}

function _createTextureLightnessFilter(textureLightness:number):string {
  return textureLightness === 1 ? 'none' : `brightness(${textureLightness})`;
}

export function applyPunchThroughAlpha(targetPixels:Pick<ImageData, 'data'>, sourcePixels:Pick<ImageData, 'data'>) {
  for (let pixelIndex = 0; pixelIndex < targetPixels.data.length; pixelIndex += 4) {
    const sourceAlpha = sourcePixels.data[pixelIndex + 3];
    if (sourceAlpha >= 255) continue;
    if (sourceAlpha < targetPixels.data[pixelIndex + 3]) targetPixels.data[pixelIndex + 3] = sourceAlpha;
  }
}

function _drawTextureImageOperation(faceContext:CanvasRenderingContext2D, faceWidth:number, faceHeight:number,
  image:ImageBitmap, textureImageOperation:TextureImageOperation, totalHorizontalCount:number, totalVerticalCount:number,
  textureLightness:number) {
  const resolvedHorizontalCount = textureImageOperation.horizontalCount;
  const resolvedVerticalCount = textureImageOperation.verticalCount;
  const tileWidth = faceWidth * (resolvedHorizontalCount / totalHorizontalCount);
  const tileHeight = faceHeight * (resolvedVerticalCount / totalVerticalCount);
  if (tileWidth <= 0 || tileHeight <= 0) return;

  if (textureImageOperation.alphaMode !== 'punch') {
    faceContext.save();
    faceContext.filter = _createTextureLightnessFilter(textureLightness);
    for (let drawY = 0; drawY < faceHeight; drawY += tileHeight) {
      for (let drawX = 0; drawX < faceWidth; drawX += tileWidth) {
        faceContext.drawImage(image, drawX, drawY, tileWidth, tileHeight);
      }
    }
    faceContext.restore();
    return;
  }

  const operationCanvas = createScratchCanvas(faceWidth, faceHeight);
  if (!operationCanvas) return;
  const operationContext = operationCanvas.getContext('2d');
  if (!operationContext) return;

  operationContext.save();
  operationContext.filter = _createTextureLightnessFilter(textureLightness);
  for (let drawY = 0; drawY < faceHeight; drawY += tileHeight) {
    for (let drawX = 0; drawX < faceWidth; drawX += tileWidth) {
      operationContext.drawImage(image, drawX, drawY, tileWidth, tileHeight);
    }
  }
  operationContext.restore();

  faceContext.drawImage(operationCanvas as CanvasImageSource, 0, 0);

  const targetImageData = faceContext.getImageData(0, 0, faceWidth, faceHeight);
  const sourceImageData = operationContext.getImageData(0, 0, faceWidth, faceHeight);
  applyPunchThroughAlpha(targetImageData, sourceImageData);
  faceContext.putImageData(targetImageData, 0, 0);
}

export function createTiledTextureFaceCanvas(imageSet:ImageSet, texture:Texture, totalHorizontalCount:number,
  totalVerticalCount:number, textureLightness:number, seedText:string):TextureFaceImage|null {
  if (totalHorizontalCount <= 0 || totalVerticalCount <= 0) return null;
  const textureImageOperation = findTexturePrimaryImageOperation(texture);
  if (!textureImageOperation) return null;
  const image = imageSet.get(textureImageOperation.imageUrl) || null;
  if (!image || image.width <= 0 || image.height <= 0) return null;

  const { width:faceWidth, height:faceHeight } = calcTextureFaceSize(
    image.width,
    image.height,
    totalHorizontalCount,
    totalVerticalCount,
    textureImageOperation.horizontalCount,
    textureImageOperation.verticalCount
  );
  const faceCanvas = createScratchCanvas(faceWidth, faceHeight);
  if (!faceCanvas) return null;
  const faceContext = faceCanvas.getContext('2d');
  if (!faceContext) return null;

  texture.operations.forEach((operation, operationIndex) => {
    if (isTextureImageOperation(operation)) {
      const operationImage = imageSet.get(operation.imageUrl) || null;
      if (!operationImage || operationImage.width <= 0 || operationImage.height <= 0) return;
      _drawTextureImageOperation(faceContext as unknown as CanvasRenderingContext2D, faceWidth, faceHeight, operationImage, operation,
        totalHorizontalCount, totalVerticalCount, textureLightness);
      return;
    }
    if (isTextureFilterOperation(operation)) {
      applyTextureModifiers(faceContext as unknown as CanvasRenderingContext2D, faceWidth, faceHeight, [operation], `${seedText}|${operationIndex}`);
    }
  });

  return {
    image:faceCanvas,
    width:faceWidth,
    height:faceHeight
  };
}
