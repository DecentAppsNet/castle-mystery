/* This file applies deterministic aged-stone and plaster texture overlays to images.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createScratchCanvas } from "@/game/drawing/canvasSurfaceUtil";

import { ImageFilterArgs } from "./imageFilterUtil";

type StoneOverlaySpec = Readonly<{
  coarseColumns:number,
  coarseRows:number,
  detailColumns:number,
  detailRows:number,
  coarseSeed:number,
  detailSeed:number,
  splotchThreshold:number,
  splotchRange:number,
  splotchDarkness:number,
  edgeGrimeDarkness:number,
  bottomGrimeDarkness:number
}>;

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

function _applyStoneOverlayImageFilter({ context, width, height, seed }:ImageFilterArgs, spec:StoneOverlaySpec) {
  const overlayCanvas = createScratchCanvas(width, height);
  if (!overlayCanvas) return;
  const overlayContext = overlayCanvas.getContext('2d');
  if (!overlayContext) return;

  const imageData = overlayContext.createImageData(width, height);
  const pixels = imageData.data;
  const coarseNoise = _createNoiseGrid(spec.coarseColumns, spec.coarseRows, seed ^ spec.coarseSeed);
  const detailNoise = _createNoiseGrid(spec.detailColumns, spec.detailRows, seed ^ spec.detailSeed);

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const nx = x / width;
      const ny = y / height;
      const coarse = _sampleSmoothNoise(coarseNoise, x, y, width, height);
      const detail = _sampleSmoothNoise(detailNoise, x, y, width, height);
      const blendedNoise = coarse * 0.8 + detail * 0.2;
      const splotch = _smoothstep01((blendedNoise - spec.splotchThreshold) / spec.splotchRange);
      const edgeDistance = Math.min(nx, 1 - nx, ny, 1 - ny);
      const edgeGrime = _smoothstep01((0.22 - edgeDistance) / 0.22);
      const bottomGrime = _smoothstep01((ny - 0.58) / 0.42);
      const darkness = _clamp01(
        splotch * spec.splotchDarkness
        + edgeGrime * spec.edgeGrimeDarkness
        + bottomGrime * spec.bottomGrimeDarkness
      );
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

const AGED_STONE_SPEC:StoneOverlaySpec = {
  coarseColumns:9,
  coarseRows:7,
  detailColumns:21,
  detailRows:16,
  coarseSeed:0x51a7ed57,
  detailSeed:0x0badcafe,
  splotchThreshold:0.42,
  splotchRange:0.4,
  splotchDarkness:0.18,
  edgeGrimeDarkness:0.09,
  bottomGrimeDarkness:0.06
};

const PLASTER_SPEC:StoneOverlaySpec = {
  coarseColumns:6,
  coarseRows:5,
  detailColumns:16,
  detailRows:12,
  coarseSeed:0x6a11f537,
  detailSeed:0x1a57e2d1,
  splotchThreshold:0.86,
  splotchRange:0.48,
  splotchDarkness:0.11,
  edgeGrimeDarkness:0.09,
  bottomGrimeDarkness:0.06
};

export function applyAgedStoneImageFilter(args:ImageFilterArgs) {
  _applyStoneOverlayImageFilter(args, AGED_STONE_SPEC);
}

export function applyPlasterImageFilter(args:ImageFilterArgs) {
  _applyStoneOverlayImageFilter(args, PLASTER_SPEC);
}
