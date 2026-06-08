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
    it('scales an item image draw width by the inferred 256-pixel column count when imageUrl is present', () => {
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
        drawOffset:{ x:1.5, y:-0.25, z:0.1 },
        description:'A crown.',
        isDiscovered:true
      };
      const imageBitmap = { width:520, height:20 } as ImageBitmap;
      const imageSet = createEmptyImageSet();
      imageSet.set(imageUrl, imageBitmap);
      const drawImage = vi.fn();
      const context = {
        drawImage,
        save:vi.fn(),
        restore:vi.fn()
      } as unknown as CanvasRenderingContext2D;
      const metrics = calcItemDrawMetrics(room, SCALING_FACTORS);
      const expectedImageWidthPixels = metrics.imageWidthPixels * 2;
      const projectedX = (item.position.x + item.drawOffset.x) * SCALING_FACTORS.scaleX
        + SCALING_FACTORS.roomLineWidth * 8 * (item.position.z + item.drawOffset.z);
      const projectedY = (item.position.y + item.drawOffset.y) * SCALING_FACTORS.scaleY
        + SCALING_FACTORS.roomLineWidth * 4 * (item.position.z + item.drawOffset.z);

      drawRoomItem(room, item, SCALING_FACTORS, context, imageSet);

      expect(drawImage).toHaveBeenCalledWith(
        imageBitmap,
        projectedX + metrics.imageLeftOffsetPixels - metrics.imageWidthPixels / 2,
        projectedY + metrics.imageTopOffsetPixels,
        expectedImageWidthPixels,
        metrics.imageHeightPixels
      );
    });
  });
});
