import { afterEach, describe, expect, it, vi } from 'vitest';

import { createImageAsset } from '@/game/imageAssetUtil';
import { createTiledTextureFaceCanvas } from '../textureFaceDrawUtil';
import type ImageSet from '@/game/types/ImageSet';
import type Texture from '@/game/types/Texture';

type PixelImage = Readonly<{
  width:number,
  height:number,
  pixels:Uint8ClampedArray
}>;

class FakeOffscreenCanvas {
  width:number;
  height:number;
  pixels:Uint8ClampedArray;

  constructor(width:number, height:number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }

  getContext(contextId:string) {
    if (contextId !== '2d') return null;
    return new FakeCanvasRenderingContext2D(this);
  }
}

class FakeCanvasRenderingContext2D {
  canvas:FakeOffscreenCanvas;
  filter = 'none';

  constructor(canvas:FakeOffscreenCanvas) {
    this.canvas = canvas;
  }

  save() {}
  restore() {}

  drawImage(source:PixelImage|FakeOffscreenCanvas, _dx:number, _dy:number, _dw?:number, _dh?:number) {
    const sourcePixels = source instanceof FakeOffscreenCanvas ? source.pixels : source.pixels;
    _blendPixel(this.canvas.pixels, sourcePixels);
  }

  getImageData(_sx:number, _sy:number, _sw:number, _sh:number) {
    return { data:new Uint8ClampedArray(this.canvas.pixels) } as ImageData;
  }

  putImageData(imageData:ImageData, _dx:number, _dy:number) {
    this.canvas.pixels = new Uint8ClampedArray(imageData.data);
  }
}

function _blendPixel(targetPixels:Uint8ClampedArray, sourcePixels:Uint8ClampedArray) {
  const sourceAlpha = sourcePixels[3] / 255;
  const targetAlpha = targetPixels[3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) {
    targetPixels.fill(0, 0, 4);
    return;
  }

  targetPixels[0] = Math.round(((sourcePixels[0] * sourceAlpha) + (targetPixels[0] * targetAlpha * (1 - sourceAlpha))) / outAlpha);
  targetPixels[1] = Math.round(((sourcePixels[1] * sourceAlpha) + (targetPixels[1] * targetAlpha * (1 - sourceAlpha))) / outAlpha);
  targetPixels[2] = Math.round(((sourcePixels[2] * sourceAlpha) + (targetPixels[2] * targetAlpha * (1 - sourceAlpha))) / outAlpha);
  targetPixels[3] = Math.round(outAlpha * 255);
}

function _createPixelImage(rgba:[number, number, number, number]):ImageBitmap & PixelImage {
  return {
    width:1,
    height:1,
    pixels:new Uint8ClampedArray(rgba)
  } as ImageBitmap & PixelImage;
}

describe('textureFaceDrawUtil', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createTiledTextureFaceCanvas()', () => {
    it('reapplies the sidecar punch mask after drawing so the source image cannot refill punched openings', () => {
      vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

      const bricksImage = _createPixelImage([40, 60, 80, 255]);
      const windowImage = _createPixelImage([240, 250, 255, 255]);
      const punchMaskImage = _createPixelImage([0, 0, 0, 0]);
      const imageSet:ImageSet = new Map([
        ['/assets/room/bricks.png', createImageAsset(bricksImage)],
        ['/assets/room/window.png', createImageAsset(windowImage, punchMaskImage)]
      ]);
      const texture:Texture = {
        operations:[
          { type:'image', imageUrl:'/assets/room/bricks.png', horizontalCount:1, verticalCount:1, alphaMode:'composite' },
          { type:'image', imageUrl:'/assets/room/window.png', horizontalCount:1, verticalCount:1, alphaMode:'composite' }
        ]
      };

      const faceImage = createTiledTextureFaceCanvas(imageSet, texture, 1, 1, 1, 'test');
      const faceCanvas = faceImage?.image as FakeOffscreenCanvas | undefined;

      expect(faceCanvas?.pixels).toEqual(new Uint8ClampedArray([240, 250, 255, 0]));
    });
  });
});