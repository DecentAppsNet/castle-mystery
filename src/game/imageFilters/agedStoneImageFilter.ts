import { createScratchCanvas } from "@/game/drawing/canvasSurfaceUtil";

import { ImageFilterArgs } from "./imageFilterUtil";

function _clamp01(value:number):number {
  return Math.max(0, Math.min(1, value));
}

function _smoothstep01(value:number):number {
  const t = _clamp01(value);
  return t * t * (3 - 2 * t);
}

function _lerp(a:number, b:number, t:number):number {
  return a + (b - a) * t;
}

function _createSeededRandom(seed:number):() => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function _createNoiseGrid(columns:number, rows:number, seed:number):number[][] {
  const random = _createSeededRandom(seed);
  const grid:number[][] = [];
  for (let y = 0; y < rows; ++y) {
    const row:number[] = [];
    for (let x = 0; x < columns; ++x) {
      row.push(random());
    }
    grid.push(row);
  }
  return grid;
}

function _sampleSmoothNoise(grid:number[][], x:number, y:number, width:number, height:number):number {
  const rows = grid.length;
  const columns = grid[0].length;
  const gx = _clamp01(x / width) * (columns - 1);
  const gy = _clamp01(y / height) * (rows - 1);
  const left = Math.floor(gx);
  const top = Math.floor(gy);
  const right = Math.min(columns - 1, left + 1);
  const bottom = Math.min(rows - 1, top + 1);
  const tx = _smoothstep01(gx - left);
  const ty = _smoothstep01(gy - top);
  const topValue = _lerp(grid[top][left], grid[top][right], tx);
  const bottomValue = _lerp(grid[bottom][left], grid[bottom][right], tx);
  return _lerp(topValue, bottomValue, ty);
}

export function applyAgedStoneImageFilter({ context, width, height, seed }:ImageFilterArgs) {
  const overlayCanvas = createScratchCanvas(width, height);
  if (!overlayCanvas) return;
  const overlayContext = overlayCanvas.getContext('2d');
  if (!overlayContext) return;

  const imageData = overlayContext.createImageData(width, height);
  const pixels = imageData.data;
  const coarseNoise = _createNoiseGrid(9, 7, seed ^ 0x51a7ed57);
  const detailNoise = _createNoiseGrid(21, 16, seed ^ 0x0badcafe);

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const nx = x / width;
      const ny = y / height;
      const coarse = _sampleSmoothNoise(coarseNoise, x, y, width, height);
      const detail = _sampleSmoothNoise(detailNoise, x, y, width, height);
      const blendedNoise = coarse * 0.8 + detail * 0.2;
      const splotch = _smoothstep01((blendedNoise - 0.42) / 0.4);
      const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
      const edgeGrime = _smoothstep01((0.22 - edgeDistance) / 0.22);
      const bottomGrime = _smoothstep01((ny - 0.58) / 0.42);
      const darkness = _clamp01(splotch * 0.18 + edgeGrime * 0.09 + bottomGrime * 0.06);
      const alpha = Math.round(darkness * 255);
      const pixelI = (y * width + x) * 4;
      pixels[pixelI] = 0;
      pixels[pixelI + 1] = 0;
      pixels[pixelI + 2] = 0;
      pixels[pixelI + 3] = alpha;
    }
  }

  overlayContext.putImageData(imageData, 0, 0);
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.drawImage(overlayCanvas, 0, 0);
  context.restore();
}
