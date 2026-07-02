/* This module groups shared test helpers for stubbing OffscreenCanvas in drawing-heavy game tests.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { vi } from 'vitest';

class StubOffscreenCanvasRenderingContext2D {
  canvas:StubOffscreenCanvas;
  filter = 'none';
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  font = '';
  textAlign:CanvasTextAlign = 'left';
  textBaseline:CanvasTextBaseline = 'alphabetic';
  globalCompositeOperation:GlobalCompositeOperation = 'source-over';

  constructor(canvas:StubOffscreenCanvas) {
    this.canvas = canvas;
  }

  save() {}
  restore() {}
  clearRect() {}
  fillRect() {}
  strokeRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  ellipse() {}
  arc() {}
  rect() {}
  clip() {}
  fill() {}
  stroke() {}
  translate() {}
  rotate() {}
  scale() {}
  transform() {}
  setTransform() {}
  drawImage() {}
  fillText() {}
  strokeText() {}

  measureText(text:string) {
    return {
      width:text.length * 8,
      actualBoundingBoxAscent:0,
      actualBoundingBoxDescent:0
    } as TextMetrics;
  }

  getImageData(_sx:number, _sy:number, sw:number, sh:number) {
    return { data:new Uint8ClampedArray(Math.max(0, sw * sh * 4)) } as ImageData;
  }

  putImageData() {}
}

class StubOffscreenCanvas {
  width:number;
  height:number;

  constructor(width:number, height:number) {
    this.width = width;
    this.height = height;
  }

  getContext(contextId:string) {
    if (contextId !== '2d') return null;
    return new StubOffscreenCanvasRenderingContext2D(this);
  }
}

export function stubOffscreenCanvas() {
  vi.stubGlobal('OffscreenCanvas', StubOffscreenCanvas);
}
