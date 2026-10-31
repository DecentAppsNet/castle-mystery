import { describe, expect, it, vi } from 'vitest';

import { drawRoomItem } from '../itemDrawUtil';
import { createImageAsset } from '@/game/imageAssetUtil';
import type Item from '@/game/types/Item';
import type ScalingFactors from '@/game/types/ScalingFactors';
import { createEmptyImageSet } from '@/game/imageSetUtil';

const SCALING_FACTORS:ScalingFactors = {
  sourceX:0,
  sourceY:0,
  sourceWidth:100,
  sourceHeight:100,
  scaleX:10,
  translateX:0,
  scaleY:10,
  translateY:0,
  roomFontHeight:12,
  roomLineWidth:2,
  destWidth:1000,
  destHeight:1000
};

describe('itemDrawUtil', () => {
  describe('drawRoomItem()', () => {
    it('asserts when an authored item image is missing from a non-empty image set', () => {
      const item:Item = {
        id:'crown',
        title:'Crown',
        imageUrl:'/assets/items/crown.png',
        randomSalt:0,
        isVisible:true,
        position:{ x:5, y:8, z:0.5 },
        drawOffset:{ x:0, y:0, z:0 },
        stackOffset:{ x:0, y:0, z:0 },
        description:'A crown.'
      };
      const imageSet = createEmptyImageSet();
      imageSet.set('/assets/items/other.png', createImageAsset({ width:32, height:32 } as ImageBitmap));
      const context = {
        drawImage:vi.fn(),
        save:vi.fn(),
        restore:vi.fn()
      } as unknown as CanvasRenderingContext2D;

      expect(() => drawRoomItem(item, item.position, SCALING_FACTORS, context, imageSet, false, 0))
        .toThrow('missing loaded image asset for item crown (/assets/items/crown.png)');
    });
  });
});
