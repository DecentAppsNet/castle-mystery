import { describe, expect, it, vi } from 'vitest';

import { drawRoomItem, calcItemDrawRect, getItemCanvasPositionInRoom, getItemCanvasRectInRoom } from '../itemDrawUtil';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';
import { createImageAsset } from '@/game/imageAssetUtil';
import type Item from '@/game/types/Item';
import type ScalingFactors from '@/game/types/ScalingFactors';
import { createEmptyImageSet } from '@/game/imageSetUtil';
import { ITEM_CUBOID_HEIGHT_GAME } from '@/game/itemSizeUtil';
import { createRoomContentDisplayLayout } from '@/game/roomContentDisplayPositionUtil';

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
  describe('getItemCanvasRectInRoom()', () => {
    it('matches the widened image bounds when the source image implies multiple columns', () => {
      const imageUrl = '/assets/items/crown.png';
      const item:Item = {
        id:'crown',
        title:'Crown',
        imageUrl,
        randomSalt:0,
        isVisible:true,
        position:{ x:5, y:8, z:0.5 },
        drawOffset:{ x:1.5, y:-0.25, z:0.1 },
        stackOffset:{ x:0, y:0, z:0 },
        description:'A crown.'
      };
      const imageBitmap = { width:520, height:20 } as ImageBitmap;
      const imageSet = createEmptyImageSet();
      imageSet.set(imageUrl, createImageAsset(imageBitmap));
      const itemDrawRect = calcItemDrawRect(SCALING_FACTORS);
      const expectedImageWidthPixels = itemDrawRect.widthPixels * 2;
      const expectedImageHeightPixels = expectedImageWidthPixels * imageBitmap.height / imageBitmap.width;
      const projectedX = (item.position.x + item.drawOffset.x) * SCALING_FACTORS.scaleX
        + SCALING_FACTORS.roomLineWidth * 8 * (item.position.z + item.drawOffset.z);
      const projectedY = (item.position.y + item.drawOffset.y) * SCALING_FACTORS.scaleY
        + SCALING_FACTORS.roomLineWidth * 4 * (item.position.z + item.drawOffset.z);
      const displayPosition = {
        x:item.position.x + item.drawOffset.x,
        y:item.position.y + item.drawOffset.y,
        z:item.position.z + item.drawOffset.z
      };

      expect(getItemCanvasRectInRoom(item, displayPosition, SCALING_FACTORS, imageSet)).toEqual({
        x:projectedX + itemDrawRect.leftOffsetPixels - itemDrawRect.widthPixels / 2,
        y:projectedY - expectedImageHeightPixels,
        width:expectedImageWidthPixels,
        height:expectedImageHeightPixels
      });
    });

    it('applies cumulative supporting stack offsets to a stacked item canvas position', () => {
      const room = {
        ...createDefaultRoom(),
        rect:{ x:0, y:0, width:10, height:10 },
        items:[
          { ...createDefaultItem(), id:'pedestal', position:{ x:2.5, y:9.999, z:0.5 }, drawOffset:{ x:2, y:0, z:0 }, stackOffset:{ x:1.5, y:-0.25, z:0.1 } },
          { ...createDefaultItem(), id:'tray', position:{ x:2.5, y:9.999, z:0.5 }, stackOffset:{ x:-0.5, y:-0.75, z:-0.05 } },
          { ...createDefaultItem(), id:'crown', position:{ x:2.5, y:9.999, z:0.5 }, drawOffset:{ x:0.25, y:-0.5, z:0.2 } }
        ]
      };
      const crown = room.items[2];
      const itemHeight = ITEM_CUBOID_HEIGHT_GAME;
      const displayLayout = createRoomContentDisplayLayout(room, []);
      const displayPosition = displayLayout.itemLayoutById.get(crown.id)!.displayPosition;

      const [canvasX, canvasY] = getItemCanvasPositionInRoom(displayPosition, SCALING_FACTORS);
      expect(canvasX).toBeCloseTo(
        (2.5 + 2 + 1.5 - 0.5 + 0.25) * SCALING_FACTORS.scaleX + SCALING_FACTORS.roomLineWidth * 8 * (0.5 + 0.1 - 0.05 + 0.2)
      );
      expect(canvasY).toBeCloseTo(
        (9.999 - 0.25 - itemHeight - 0.75 - itemHeight - 0.5) * SCALING_FACTORS.scaleY
          + SCALING_FACTORS.roomLineWidth * 4 * (0.5 + 0.1 - 0.05 + 0.2)
      );
    });
  });

  describe('drawRoomItem()', () => {
    it('scales an item image draw width by the inferred 256-pixel column count when imageUrl is present', () => {
      const imageUrl = '/assets/items/crown.png';
      const item:Item = {
        id:'crown',
        title:'Crown',
        imageUrl,
        randomSalt:0,
        isVisible:true,
        position:{ x:5, y:8, z:0.5 },
        drawOffset:{ x:1.5, y:-0.25, z:0.1 },
        stackOffset:{ x:0, y:0, z:0 },
        description:'A crown.'
      };
      const imageBitmap = { width:520, height:20 } as ImageBitmap;
      const imageSet = createEmptyImageSet();
      imageSet.set(imageUrl, createImageAsset(imageBitmap));
      const drawImage = vi.fn();
      const context = {
        drawImage,
        save:vi.fn(),
        restore:vi.fn()
      } as unknown as CanvasRenderingContext2D;
      const itemDrawRect = calcItemDrawRect(SCALING_FACTORS);
      const expectedImageWidthPixels = itemDrawRect.widthPixels * 2;
      const expectedImageHeightPixels = expectedImageWidthPixels * imageBitmap.height / imageBitmap.width;
      const projectedX = (item.position.x + item.drawOffset.x) * SCALING_FACTORS.scaleX
        + SCALING_FACTORS.roomLineWidth * 8 * (item.position.z + item.drawOffset.z);
      const projectedY = (item.position.y + item.drawOffset.y) * SCALING_FACTORS.scaleY
        + SCALING_FACTORS.roomLineWidth * 4 * (item.position.z + item.drawOffset.z);
      const displayPosition = {
        x:item.position.x + item.drawOffset.x,
        y:item.position.y + item.drawOffset.y,
        z:item.position.z + item.drawOffset.z
      };

      drawRoomItem(item, displayPosition, SCALING_FACTORS, context, imageSet, false, 0);

      expect(drawImage).toHaveBeenCalledWith(
        imageBitmap,
        projectedX + itemDrawRect.leftOffsetPixels - itemDrawRect.widthPixels / 2,
        projectedY - expectedImageHeightPixels,
        expectedImageWidthPixels,
        expectedImageHeightPixels
      );
    });

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
