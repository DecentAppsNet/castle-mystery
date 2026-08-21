import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { drawCharacter, drawEmitBubble, drawObscuredActiveCharacter, getCharacterCanvasRect } from '../characterDrawUtil';
import { createImageAsset } from '@/game/imageAssetUtil';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import type Effect from '@/game/effects/types/Effect';
import type ImageSet from '@/game/types/ImageSet';
import type ScalingFactors from '@/game/types/ScalingFactors';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';

const SCALING_FACTORS:ScalingFactors = {
  sourceX:0,
  sourceY:0,
  sourceWidth:100,
  sourceHeight:100,
  scaleX:1,
  translateX:0,
  scaleY:1,
  translateY:0,
  roomFontHeight:12,
  roomLineWidth:10,
  destWidth:100,
  destHeight:100
};

describe('characterDrawUtil', () => {
  beforeEach(() => {
    stubOffscreenCanvas();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getCharacterCanvasRect()', () => {
    it('extends bounds to include a drawn face image', () => {
      const character = {
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png'
      };
      const imageSet:ImageSet = new Map([
        ['/assets/faces/test.png', createImageAsset({ width:120, height:120 } as ImageBitmap)]
      ]);

      const rectWithoutFaceImage = getCharacterCanvasRect({ ...character, faceImageUrl:null }, SCALING_FACTORS, 0, imageSet);
      const rectWithFaceImage = getCharacterCanvasRect(character, SCALING_FACTORS, 0, imageSet);

      expect(rectWithFaceImage.y).toBeLessThan(rectWithoutFaceImage.y);
      expect(rectWithFaceImage.height).toBeGreaterThan(rectWithoutFaceImage.height);
      expect(rectWithFaceImage.width).toBeGreaterThan(rectWithoutFaceImage.width);
    });

    it('raises the rendered rect when a room item stack shares the character square', () => {
      const room = {
        ...createDefaultRoom(),
        rect:{ x:0, y:0, width:40, height:30 },
        items:[
          { ...createDefaultItem(), id:'crate', position:{ x:12.5, y:29.999, z:0.5 } },
          { ...createDefaultItem(), id:'box', position:{ x:12.5, y:29.999, z:0.5 } }
        ]
      };
      const character = {
        ...createDefaultCharacter(),
        position:{ x:12.5, y:29.999, z:0.5 }
      };

      const floorRect = getCharacterCanvasRect(character, SCALING_FACTORS, 0);
      const stackedRect = getCharacterCanvasRect(character, SCALING_FACTORS, 0, null, room);

      expect(stackedRect.y).toBeLessThan(floorRect.y);
      expect(stackedRect.height).toBe(floorRect.height);
    });
  });

  describe('drawCharacter()', () => {
    it('keeps the laying head upright for both facing directions by mirroring only the left-facing pose', () => {
      const imageSet:ImageSet = new Map([
        ['/assets/faces/test.png', createImageAsset({ width:120, height:120 } as ImageBitmap)]
      ]);
      const effects:Effect[] = [];

      const rightTransforms = _drawAndCaptureHeadTransforms({
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png',
        bodyOrientation:'laying',
        facingDirection:'right'
      }, imageSet, effects);
      const leftTransforms = _drawAndCaptureHeadTransforms({
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png',
        bodyOrientation:'laying',
        facingDirection:'left'
      }, imageSet, effects);

      expect(rightTransforms.rotations).toContain(-Math.PI / 2);
      expect(rightTransforms.scales).not.toContainEqual([-1, 1]);
      expect(leftTransforms.rotations).toContain(Math.PI / 2);
      expect(leftTransforms.scales).toContainEqual([-1, 1]);
    });
  });

  describe('drawObscuredActiveCharacter()', () => {
    it('keeps the obscured head silhouette fixed regardless of the active character facing direction', () => {
      const room = { ...createDefaultRoom(), rect:{ x:0, y:0, width:20, height:20 }, title:'Test Room' };
      const imageSet:ImageSet = new Map([
        ['/assets/faces/test.png', createImageAsset({ width:120, height:120 } as ImageBitmap)]
      ]);

      const rightFacingScales = _drawObscuredAndCaptureScales({
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png',
        facingDirection:'right'
      }, room, imageSet);
      const leftFacingScales = _drawObscuredAndCaptureScales({
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png',
        facingDirection:'left'
      }, room, imageSet);

      expect(rightFacingScales).not.toContainEqual([-1, 1]);
      expect(leftFacingScales).not.toContainEqual([-1, 1]);
    });
  });

  describe('drawEmitBubble()', () => {
    it('keeps the text layout fixed while the bubble chrome shrinks to normal size', () => {
      const fillTextCalls:{ text:string, x:number, y:number }[] = [];
      const rectCalls:{ left:number, top:number, width:number, height:number }[] = [];
      const context = {
        save() {},
        restore() {},
        beginPath() {},
        fill() {},
        stroke() {},
        measureText(text:string) { return { width:text.length * 6 }; },
        fillText(text:string, x:number, y:number) { fillTextCalls.push({ text, x, y }); },
        rect(left:number, top:number, width:number, height:number) { rectCalls.push({ left, top, width, height }); },
        canvas:{ width:200, height:200 },
        lineWidth:0,
        strokeStyle:'',
        fillStyle:'',
        textAlign:'left',
        textBaseline:'alphabetic',
        font:''
      } as unknown as CanvasRenderingContext2D;

      drawEmitBubble('Hello', 100, 80, SCALING_FACTORS, context, 1_000, 1_000);
      drawEmitBubble('Hello', 100, 80, SCALING_FACTORS, context, 1_000, 1_300);

      expect(fillTextCalls[0]).toEqual(fillTextCalls[1]);
      expect(fillTextCalls[0]).toEqual({ text:'Hello', x:100, y:40 });
      expect(rectCalls[0].width).toBeGreaterThan(rectCalls[1].width);
      expect(rectCalls[0].height).toBeGreaterThan(rectCalls[1].height);
    });
  });
});

function _drawAndCaptureHeadTransforms(character:ReturnType<typeof createDefaultCharacter>, imageSet:ImageSet, effects:Effect[]):{ rotations:number[], scales:[number, number][] } {
  const rotations:number[] = [];
  const scales:[number, number][] = [];
  const context = {
    save() {},
    restore() {},
    translate() {},
    rotate(angle:number) { rotations.push(angle); },
    scale(x:number, y:number) { scales.push([x, y]); },
    drawImage() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {},
    fill() {},
    strokeText() {},
    fillText() {},
    lineWidth:0,
    strokeStyle:'',
    fillStyle:'',
    textAlign:'left',
    textBaseline:'alphabetic',
    lineJoin:'miter',
    font:''
  } as unknown as CanvasRenderingContext2D;

  drawCharacter(character, SCALING_FACTORS, context, 0, imageSet, effects, false, null, 0);
  return { rotations, scales };
}

function _drawObscuredAndCaptureScales(character:ReturnType<typeof createDefaultCharacter>, room:ReturnType<typeof createDefaultRoom>, imageSet:ImageSet):[number, number][] {
  const scales:[number, number][] = [];
  const context = {
    save() {},
    restore() {},
    translate() {},
    scale(x:number, y:number) { scales.push([x, y]); },
    drawImage() {},
    beginPath() {},
    ellipse() {},
    fill() {},
    measureText(text:string) { return { width:text.length * 6 }; },
    lineWidth:0,
    strokeStyle:'',
    fillStyle:'',
    textAlign:'left',
    textBaseline:'alphabetic',
    font:''
  } as unknown as CanvasRenderingContext2D;

  drawObscuredActiveCharacter(room, character, SCALING_FACTORS, context, imageSet);
  return scales;
}