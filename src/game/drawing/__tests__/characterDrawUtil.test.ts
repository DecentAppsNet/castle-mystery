import { describe, expect, it } from 'vitest';

import { getCharacterCanvasRect, getCharacterSpeechAnchor } from '../characterDrawUtil';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import type ScalingFactors from '@/game/types/ScalingFactors';

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
  describe('getCharacterSpeechAnchor()', () => {
    it('disables sway for dead characters in every body orientation', () => {
      const time = CHARACTER_SWAY_INTERVAL_TEST_TIME;

      (['standing', 'sitting', 'kneeling', 'laying'] as const).forEach(bodyOrientation => {
        const aliveCharacter = {
          ...createDefaultCharacter(),
          x:10,
          y:20,
          randomSalt:0,
          bodyOrientation,
          isAlive:true
        };
        const deadCharacter = { ...aliveCharacter, isAlive:false };

        const aliveAnchor = getCharacterSpeechAnchor(aliveCharacter, SCALING_FACTORS, time);
        const deadAnchor = getCharacterSpeechAnchor(deadCharacter, SCALING_FACTORS, time);

        expect(aliveAnchor.anchorX).not.toBe(aliveAnchor.centerX);
        expect(deadAnchor.anchorX).toBe(deadAnchor.centerX);
      });
    });
  });

  describe('getCharacterCanvasRect()', () => {
    it('extends bounds to include a drawn face image', () => {
      const character = {
        ...createDefaultCharacter(),
        faceImageUrl:'/assets/faces/test.png'
      };
      const imageSet = new Map<string, ImageBitmap>([['/assets/faces/test.png', { width:120, height:120 } as ImageBitmap]]);

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
          { ...createDefaultItem(), id:'crate', position:{ x:10, y:29.999, z:0.5 } },
          { ...createDefaultItem(), id:'box', position:{ x:10, y:26.82, z:0.5 } }
        ]
      };
      const character = {
        ...createDefaultCharacter(),
        position:{ x:10, y:29.999, z:0.5 }
      };

      const floorRect = getCharacterCanvasRect(character, SCALING_FACTORS, 0);
      const stackedRect = getCharacterCanvasRect(character, SCALING_FACTORS, 0, null, room);

      expect(stackedRect.y).toBeLessThan(floorRect.y);
      expect(stackedRect.height).toBe(floorRect.height);
    });
  });
});

const CHARACTER_SWAY_INTERVAL_TEST_TIME = 375;