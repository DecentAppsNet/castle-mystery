import { describe, expect, it, vi } from 'vitest';

import { drawRoomItem, calcItemDrawMetrics } from '../itemDrawUtil';
import { createDefaultRoom } from '@/game/types/Room';
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
    it('draws an item image into the projected cuboid bounding box when imageUrl is present', () => {
      const imageUrl = '/assets/items/crown.png';
      const room = {
        ...createDefaultRoom(),
        rect:{ x:0, y:0, width:10, height:10 }
      };
      const item:Item = {
        id:'crown',
        title:'Crown',
        displayChar:'C',
        imageUrl,
        randomSalt:0,
        position:{ x:5, y:8, z:0.5 },
        description:'A crown.',
        isDiscovered:true
      };
      const imageBitmap = { width:40, height:20 } as ImageBitmap;
      const imageSet = createEmptyImageSet();
      imageSet.set(imageUrl, imageBitmap);
      const drawImage = vi.fn();
      const context = {
        drawImage,
        save:vi.fn(),
        restore:vi.fn()
      } as unknown as CanvasRenderingContext2D;
      const metrics = calcItemDrawMetrics(room, SCALING_FACTORS);
      const projectedX = item.position.x * SCALING_FACTORS.scaleX + SCALING_FACTORS.roomLineWidth * 8 * item.position.z;
      const projectedY = item.position.y * SCALING_FACTORS.scaleY + SCALING_FACTORS.roomLineWidth * 4 * item.position.z;

      drawRoomItem(room, item, SCALING_FACTORS, context, imageSet);

      expect(drawImage).toHaveBeenCalledWith(
        imageBitmap,
        projectedX + metrics.imageLeftOffsetPixels,
        projectedY + metrics.imageTopOffsetPixels,
        metrics.imageWidthPixels,
        metrics.imageHeightPixels
      );
    });
  });
});
