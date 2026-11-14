import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImageSetFromLevel } from '../imageSetUtil';
import { ImageSet } from '@/imageLoading';
import { createDefaultMutableLevel } from '../types/Level';
import { createDefaultCharacter } from '../types/Character';
import { createDefaultCharacterBody, replaceHeadImage } from '../characterBody';
import BodyPart from '../characterBody/types/BodyPart';
import { stubOffscreenCanvas } from '../test/stubOffscreenCanvas';
import { createGameState } from '../gameUtil';
import Conclusion from '../conclusions/types/Conclusion';
import ClozePartType from '../conclusions/types/ClozePartType';

function _createImageConclusion(imageUrl:string|string[]):Conclusion {
  return {
    id:'test', title:'Test', parts:[{ type:ClozePartType.image, imageUrl }],
    isComplete:false, isLocked:false, unlockConclusionIds:[], revealRoomIds:[]
  };
}

type PhysicalBodyPart = Exclude<BodyPart, { kind:'nearHand'|'farHand' }>;

describe('imageSetUtil', () => {
  beforeEach(() => {
    stubOffscreenCanvas();
    vi.stubGlobal('window', { location:{ pathname:'/castle-mystery/' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(), {
      headers:{ 'content-type':'image/png' }
    })));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width:1, height:1 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('ImageSet construction', () => {
    it('synchronously returns an empty class instance without image I/O', () => {
      const imageSet = new ImageSet();

      expect(imageSet).toBeInstanceOf(ImageSet);
      expect(imageSet.size).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });
  });

  describe('createImageSetFromLevel()', () => {
    it('chooses the first successful candidate and does not request later alternatives', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];

      const imageSet = await createImageSetFromLevel(level);

      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/conclusions/test.png' });
      expect(imageSet.findImage('/assets/conclusions/test.png')).not.toBeNull();
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/test.png');
    });

    it('awaits each candidate failure before requesting the next alternative', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      const firstResponse = Promise.withResolvers<Response>();
      const firstRequested = Promise.withResolvers<void>();
      vi.mocked(fetch).mockImplementation(async url => {
        if (url === '/castle-mystery/assets/conclusions/test.png') {
          firstRequested.resolve();
          return firstResponse.promise;
        }
        return new Response(new Blob());
      });
      const loading = createImageSetFromLevel(level);
      await firstRequested.promise;

      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/test.png');
      firstResponse.resolve(new Response(null, { status:404 }));
      const imageSet = await loading;
      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/bodies/test.png' });
      expect(imageSet.findImage('/assets/conclusions/test.png')).toBeNull();
      expect(imageSet.findImage('/assets/bodies/test.png')).not.toBeNull();
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/bodies/test.punch.png');
    });

    it('falls back after a candidate decode failure', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        headers:{ 'content-type':url === '/castle-mystery/assets/conclusions/test.png' ? 'image/broken' : 'image/png' }
      }));
      vi.mocked(createImageBitmap).mockImplementation(async source => {
        if (source instanceof Blob && source.type === 'image/broken') throw new Error('Decode failed');
        return { width:1, height:1 } as ImageBitmap;
      });

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.findImage('/assets/conclusions/test.png')).toBeNull();
      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/bodies/test.png' });
    });

    it('reuses an already loaded direct candidate without probing earlier alternatives', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/bodies/test.png';
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];

      const imageSet = await createImageSetFromLevel(level);

      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/bodies/test.png' });
      expect(imageSet.findImage('/assets/bodies/test.png')).not.toBeNull();
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/conclusions/test.png');
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/test.png')).toHaveLength(1);
    });

    it('reuses a resolved candidate across conclusions', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [
        _createImageConclusion(['/assets/conclusions/first.png', '/assets/bodies/shared.png']),
        { ..._createImageConclusion(['/assets/conclusions/second.png', '/assets/bodies/shared.png']), id:'second' }
      ];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/conclusions/first.png' ? 404 : 200
      }));

      await createImageSetFromLevel(level);

      expect(level.conclusions.map(conclusion => conclusion.parts[0])).toEqual([
        { type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' },
        { type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' }
      ]);
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/conclusions/second.png');
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/shared.png')).toHaveLength(1);
    });

    it('rejects candidate exhaustion with the ordered candidate URLs', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:String(url).endsWith('/test.png') ? 404 : 200
      }));

      await expect(createImageSetFromLevel(level)).rejects.toThrow(
        'Could not load conclusion image candidates: /assets/conclusions/test.png, /assets/bodies/test.png');
      expect(level.conclusions[0].parts[0]).toEqual({
        type:ClozePartType.image, imageUrl:['/assets/conclusions/test.png', '/assets/bodies/test.png']
      });
    });

    it('rejects direct-image failure without starting candidate probing', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/backgrounds/missing.png' ? 404 : 200
      }));

      await expect(createImageSetFromLevel(level)).rejects.toThrow('/assets/backgrounds/missing.png');
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/conclusions/test.png');
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/test.png');
    });

    it('rejects an unavailable configured head image with its canonical URL', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(),
        rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/missing.png') }];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/bodies/missing.png' ? 404 : 200
      }));

      await expect(createImageSetFromLevel(level)).rejects.toThrow(
        'Could not load image /assets/bodies/missing.png: Image fetch failed (404)');
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
      const root = createDefaultCharacterBody();
      expect(root.kind).toBe('torso');
      level.characters = [{ ...createDefaultCharacter(), rootBodyPart:{
        ...root, kind:'torso', imageUrl:'/assets/bodies/torso.png'
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

      expect(imageSet.findImage('/assets/bodies/head.png')?.punchMaskImage).toBeNull();
      expect(imageSet.findImage('/assets/bodies/head.png')?.image).toEqual({ width:1, height:1 });
    });

    it('rejects a missing non-character asset with its canonical URL', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/backgrounds/missing.png' ? 404 : 200
      }));

      await expect(createImageSetFromLevel(level)).rejects.toThrow('/assets/backgrounds/missing.png');
    });

    it('keeps omitted character artwork headless while loading built-in assets', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [createDefaultCharacter()];

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.size).toBeGreaterThan(0);
      expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/assets/bodies/'));
    });

    it('does not publish game state from a failed batch even after other loads succeed', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      const failureResponse = Promise.withResolvers<Response>();
      const successfulDecode = Promise.withResolvers<void>();
      vi.mocked(fetch).mockImplementation(async url => {
        if (url === '/castle-mystery/assets/backgrounds/missing.png') return failureResponse.promise;
        return new Response(new Blob());
      });
      vi.mocked(createImageBitmap).mockImplementation(async () => {
        successfulDecode.resolve();
        return { width:1, height:1 } as ImageBitmap;
      });
      const publish = vi.fn();
      const loading = createImageSetFromLevel(level).then(imageSet => {
        const gameState = createGameState(level, imageSet);
        publish(gameState);
        return gameState;
      });
      const rejected = expect(loading).rejects.toThrow('/assets/backgrounds/missing.png');
      await successfulDecode.promise;

      expect(publish).not.toHaveBeenCalled();
      failureResponse.resolve(new Response(null, { status:404 }));
      await rejected;
      expect(publish).not.toHaveBeenCalled();
    });

    it('probes optional masks for non-character direct images', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/sky.png';
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:String(url).endsWith('.punch.png') ? 404 : 200
      }));

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.findImage('/assets/backgrounds/sky.png')?.punchMaskImage).toBeNull();
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/sky.punch.png');
    });

    it('loads every body part and skin override', async () => {
      const root = createDefaultCharacterBody();
      expect(root.kind).toBe('torso');
      const rootBodyPart = {
        ...root, kind:'torso' as const, imageUrl:'/assets/bodies/torso.png',
        connectedParts:root.connectedParts.map(connection => {
          const part = connection.part as PhysicalBodyPart;
          expect(['nearHand', 'farHand']).not.toContain(part.kind);
          return { ...connection, part:{ ...part, imageUrl:`/assets/bodies/${part.kind}.png` } };
        })
      };
      const level = createDefaultMutableLevel();
      level.characters = [{
        ...createDefaultCharacter(), rootBodyPart,
        skins:[{ id:'character-alternate', description:null, headImageUrl:'/assets/bodies/alternate.png' }]
      }];

      const imageSet = await createImageSetFromLevel(level);

      for (const kind of ['torso', 'head', 'farArm', 'nearArm', 'leftLeg', 'rightLeg', 'alternate']) {
        expect(imageSet.findImage(`/assets/bodies/${kind}.png`)).not.toBeNull();
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
      level.backgroundImageUrl = '/assets/bodies/shared.png';

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.findImage('/assets/bodies/shared.png')).not.toBeNull();
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/shared.png')).toHaveLength(1);
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/shared.punch.png')).toHaveLength(1);
    });

    it('loads images on nested descendants and ignores null part images', async () => {
      const root = createDefaultCharacterBody();
      const nestedPart = root.connectedParts[1].part;
      expect(nestedPart.kind).toBe('farArm');
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(), rootBodyPart:{ ...root, connectedParts:[{
        ...root.connectedParts[0], part:{ ...root.connectedParts[0].part, connectedParts:[{
          connectionPoint:[0, 0], part:{ ...nestedPart, kind:'farArm', imageUrl:'/assets/bodies/nested.png' }
        }] }
      }] } }];

      const imageSet = await createImageSetFromLevel(level);

      expect(imageSet.findImage('/assets/bodies/nested.png')).not.toBeNull();
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/head.png');
    });
  });
});