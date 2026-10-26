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
    it('rejects an unavailable configured head image with its canonical URL', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(),
        rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/missing.png') }];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/bodies/missing.png' ? 404 : 200
      }));

      await expect(createImageSetFromLevel(level)).rejects.toThrow(
        'Could not load required character images (fetch or decode failed): /assets/bodies/missing.png');
    });

    it('rejects an undecodable skin override even when it is not selected', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(),
        skins:[{ id:'character-alternate', description:null, headImageUrl:'/assets/bodies/broken.png' }] }];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        headers:{ 'content-type':url === '/castle-mystery/assets/bodies/broken.png' ? 'image/broken' : 'image/png' }
      }));
      vi.mocked(createImageBitmap).mockImplementation(async source => {
        if (source instanceof Blob && source.type === 'image/broken') throw new Error('decode failed');
        return { width:1, height:1 } as ImageBitmap;
      });

      await expect(createImageSetFromLevel(level)).rejects.toThrow('/assets/bodies/broken.png');
    });

    it('rejects a network failure for a configured non-head body part', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(), rootBodyPart:{
        ...createDefaultCharacterBody(), imageUrl:'/assets/bodies/torso.png'
      } }];
      vi.mocked(fetch).mockImplementation(async url => {
        if (url === '/castle-mystery/assets/bodies/torso.png') throw new Error('network failed');
        return new Response(new Blob());
      });

      await expect(createImageSetFromLevel(level)).rejects.toThrow('/assets/bodies/torso.png');
    });

    it('keeps a loaded character image when its optional punch mask is absent', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(),
        rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/head.png') }];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:String(url).endsWith('.punch.png') ? 404 : 200
      }));

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.get('/assets/bodies/head.png')?.punchMaskImage).toBeNull();
      expect(imageSet.get('/assets/bodies/head.png')?.image).toEqual({ width:1, height:1 });
    });

    it('tolerates unrelated asset failures and omitted character images', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [createDefaultCharacter()];
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status:404 }));

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.size).toBe(0);
      expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/assets/bodies/'));
    });

    it('loads every body part and skin override', async () => {
      const root = createDefaultCharacterBody();
      const rootBodyPart = {
        ...root, imageUrl:'/assets/bodies/torso.png',
        connectedParts:root.connectedParts.map(connection => ({
          ...connection, part:{ ...connection.part, imageUrl:`/assets/bodies/${connection.part.kind}.png` }
        }))
      };
      const level = createDefaultMutableLevel();
      level.characters = [{
        ...createDefaultCharacter(), rootBodyPart,
        skins:[{ id:'character-alternate', description:null, headImageUrl:'/assets/bodies/alternate.png' }]
      }];

      const imageSet = await createImageSetFromLevel(level);

      for (const kind of ['torso', 'head', 'farArm', 'nearArm', 'leftLeg', 'rightLeg', 'alternate']) {
        expect(imageSet.has(`/assets/bodies/${kind}.png`)).toBe(true);
        expect(fetch).toHaveBeenCalledWith(`/castle-mystery/assets/bodies/${kind}.png`);
      }
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