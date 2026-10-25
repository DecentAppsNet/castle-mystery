import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImageSetFromLevel } from '../imageSetUtil';
import { createDefaultMutableLevel } from '../types/Level';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultCharacterBody, replaceHeadImage } from '../characterBody';

describe('imageSetUtil', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(), {
      headers:{ 'content-type':'image/png' }
    })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:1, height:1 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createImageSetFromLevel()', () => {
    it('loads every body part and skin override without reading the temporary character image', async () => {
      const root = createDefaultCharacterBody();
      const rootBodyPart = {
        ...root, imageUrl:'/assets/bodies/torso.png',
        connectedParts:root.connectedParts.map(connection => ({
          ...connection, part:{ ...connection.part, imageUrl:`/assets/bodies/${connection.part.kind}.png` }
        }))
      };
      const level = createDefaultMutableLevel();
      level.characters = [{
        ...createDefaultCharacter(), rootBodyPart, faceImageUrl:'/assets/bodies/stale.png',
        skins:[{ id:'character-alternate', description:null, headImageUrl:'/assets/bodies/alternate.png' }]
      }];

      const imageSet = await createImageSetFromLevel(level);

      for (const kind of ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'alternate']) {
        expect(imageSet.has(`/assets/bodies/${kind}.png`)).toBe(true);
        expect(fetch).toHaveBeenCalledWith(`/castle-mystery/assets/bodies/${kind}.png`);
      }
      expect(imageSet.has('/assets/bodies/stale.png')).toBe(false);
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/stale.png');
    });

    it('deduplicates shared body and skin URLs across characters', async () => {
      const character = {
        ...createDefaultCharacter(),
        rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/shared.png'),
        skins:[{ id:'character-alternate', description:null, headImageUrl:'/assets/bodies/shared.png' }]
      };
      const level = createDefaultMutableLevel();
      level.characters = [character, { ...character, id:'other' }];

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.has('/assets/bodies/shared.png')).toBe(true);
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/shared.png')).toHaveLength(1);
    });

    it('loads images on nested descendants and ignores null part images', async () => {
      const root = createDefaultCharacterBody();
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(), rootBodyPart:{ ...root, connectedParts:[{
        ...root.connectedParts[0], part:{ ...root.connectedParts[0].part, connectedParts:[{
          connectionPoint:[0, 0], part:{ ...root.connectedParts[1].part, imageUrl:'/assets/bodies/nested.png' }
        }] }
      }] } }];

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.has('/assets/bodies/nested.png')).toBe(true);
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/head.png');
    });
  });
});