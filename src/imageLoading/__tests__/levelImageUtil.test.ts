import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImageSet, updateImageSetForLevel } from '../levelImageUtil';
import ImageSet from '../ImageSet';
import { createDefaultMutableLevel } from '@/levelLoading/types/Level';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultCharacterBody, replaceHeadImage } from '@/game/characterBody';
import BodyPart from '@/game/characterBody/types/BodyPart';
import { stubOffscreenCanvas } from '@/game/test/stubOffscreenCanvas';
import { createGameState } from '@/game/gameUtil';
import Conclusion from '@/conclusions/types/Conclusion';
import ClozePartType from '@/conclusions/types/ClozePartType';

function _createImageConclusion(imageUrl:string|string[]):Conclusion {
  return {
    id:'test', title:'Test', parts:[{ type:ClozePartType.image, imageUrl }],
    isComplete:false, isLocked:false, isOptional:false, incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
  };
}

type PhysicalBodyPart = Exclude<BodyPart, { kind:'nearHand'|'farHand' }>;

describe('levelImageUtil', () => {
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

  describe('createImageSet()', () => {
    it('publishes startup assets under canonical rather than deployment-prefixed keys', async () => {
      const imageSet = await createImageSet();
      const requestedUrls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
      const primaryUrls = requestedUrls.filter(url => !url.endsWith('.punch.png'));

      expect(primaryUrls.length).toBeGreaterThan(0);
      for (const requestedUrl of primaryUrls) {
        expect(requestedUrl).toMatch(/^\/castle-mystery\/assets\//);
        const imageUrl = requestedUrl.slice('/castle-mystery'.length);
        const asset = imageSet.findImage(imageUrl);
        expect(asset).not.toBeNull();
        expect(imageSet.findImage(requestedUrl)).toBeNull();
      }
    });

    it('waits for asset preparation before returning the permanent store', async () => {
      const decoding = Promise.withResolvers<ImageBitmap>();
      const decodeStarted = Promise.withResolvers<void>();
      vi.mocked(createImageBitmap).mockImplementation(() => {
        decodeStarted.resolve();
        return decoding.promise;
      });
      const completed = vi.fn();
      const loading = createImageSet().then(imageSet => {
        completed(imageSet);
        return imageSet;
      });
      await decodeStarted.promise;

      expect(completed).not.toHaveBeenCalled();
      decoding.resolve({ width:1, height:1 } as ImageBitmap);
      const imageSet = await loading;
      expect(completed).toHaveBeenCalledExactlyOnceWith(imageSet);
    });

    it('rejects required startup image failure with its canonical URL', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status:404 }));

      await expect(createImageSet()).rejects.toThrow('/assets/');
    });
  });

  describe('updateImageSetForLevel()', () => {
    it('preserves registered asset identity without repeating image or mask I/O', async () => {
      const imageSet = new ImageSet();
      const preexistingAsset = await imageSet.loadImage('/assets/ui/preexisting.png', true);
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/shared.png';
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      await updateImageSetForLevel(level, imageSet);
      const backgroundAsset = imageSet.findImage(level.backgroundImageUrl);
      const conclusionAsset = imageSet.findImage('/assets/conclusions/test.png');
      expect(backgroundAsset).not.toBeNull();
      expect(conclusionAsset).not.toBeNull();
      const size = imageSet.size;
      vi.mocked(fetch).mockClear();
      vi.mocked(createImageBitmap).mockClear();

      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.findImage('/assets/ui/preexisting.png')).toBe(preexistingAsset);
      expect(imageSet.findImage(level.backgroundImageUrl)).toBe(backgroundAsset);
      expect(imageSet.findImage('/assets/conclusions/test.png')).toBe(conclusionAsset);
      expect(imageSet.size).toBe(size);
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it('loads new direct and candidate images and reuses a URL shared by both', async () => {
      const imageSet = new ImageSet();
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/bodies/shared.png';
      level.conclusions = [
        _createImageConclusion(['/assets/conclusions/shared.png', '/assets/bodies/shared.png']),
        { ..._createImageConclusion(['/assets/conclusions/new.png', '/assets/bodies/new.png']), id:'new' }
      ];

      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.size).toBe(2);
      expect(imageSet.findImage('/assets/bodies/shared.png')).not.toBeNull();
      expect(imageSet.findImage('/assets/conclusions/new.png')).not.toBeNull();
      expect(level.conclusions.map(conclusion => conclusion.parts[0])).toEqual([
        { type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' },
        { type:ClozePartType.image, imageUrl:'/assets/conclusions/new.png' }
      ]);
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/conclusions/shared.png');
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/new.png');
      expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === '/castle-mystery/assets/bodies/shared.png')).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/conclusions/new.punch.png');
    });

    it('adds assets across sequential levels without removing outgoing or reloading shared assets', async () => {
      const imageSet = new ImageSet();
      const firstLevel = createDefaultMutableLevel();
      firstLevel.backgroundImageUrl = '/assets/backgrounds/first.png';
      firstLevel.conclusions = [_createImageConclusion('/assets/bodies/shared.png')];
      await updateImageSetForLevel(firstLevel, imageSet);
      const outgoingAsset = imageSet.findImage(firstLevel.backgroundImageUrl);
      const sharedAsset = imageSet.findImage('/assets/bodies/shared.png');
      const size = imageSet.size;
      const secondLevel = createDefaultMutableLevel();
      secondLevel.backgroundImageUrl = '/assets/backgrounds/second.png';
      secondLevel.conclusions = [_createImageConclusion(['/assets/conclusions/shared.png', '/assets/bodies/shared.png'])];
      vi.mocked(fetch).mockClear();

      await updateImageSetForLevel(secondLevel, imageSet);

      expect(imageSet.findImage(firstLevel.backgroundImageUrl)).toBe(outgoingAsset);
      expect(imageSet.findImage('/assets/bodies/shared.png')).toBe(sharedAsset);
      expect(imageSet.findImage(secondLevel.backgroundImageUrl)).not.toBeNull();
      expect(imageSet.size).toBe(size + 1);
      expect(secondLevel.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/second.png');
      expect(fetch).toHaveBeenCalledWith('/castle-mystery/assets/backgrounds/second.punch.png');
    });

    it('rejects required direct-image failure without removing preexisting assets or probing candidates', async () => {
      const imageSet = new ImageSet();
      const outgoingAsset = await imageSet.loadImage('/assets/backgrounds/outgoing.png');
      const size = imageSet.size;
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status:404 }));
      vi.mocked(fetch).mockClear();

      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow('/assets/backgrounds/missing.png');

      expect(imageSet.findImage('/assets/backgrounds/outgoing.png')).toBe(outgoingAsset);
      expect(imageSet.size).toBe(size);
      expect(fetch).toHaveBeenCalledExactlyOnceWith('/castle-mystery/assets/backgrounds/missing.png');
    });

    it('preserves preexisting assets and unresolved references when all candidates fail', async () => {
      const imageSet = new ImageSet();
      const outgoingAsset = await imageSet.loadImage('/assets/backgrounds/outgoing.png');
      const level = createDefaultMutableLevel();
      const candidateUrls = ['/assets/conclusions/missing.png', '/assets/bodies/missing.png'];
      level.conclusions = [_createImageConclusion(candidateUrls)];
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status:404 }));

      const loading = updateImageSetForLevel(level, imageSet);
      await expect(loading).rejects.toThrow(candidateUrls[0]);
      await expect(loading).rejects.toThrow(candidateUrls[1]);

      expect(imageSet.findImage('/assets/backgrounds/outgoing.png')).toBe(outgoingAsset);
      expect(imageSet.size).toBe(1);
      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:candidateUrls });
    });

    it('loads permanent and level assets without reloading a shared permanent reference', async () => {
      const imageSet = await createImageSet();
      const requestedUrl = String(vi.mocked(fetch).mock.calls[0][0]);
      const permanentUrl = requestedUrl.slice('/castle-mystery'.length);
      const permanentAsset = imageSet.findImage(permanentUrl);
      expect(permanentAsset).not.toBeNull();
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = permanentUrl;
      level.conclusions = [_createImageConclusion('/assets/conclusions/test.png')];
      vi.mocked(fetch).mockClear();

      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.findImage(permanentUrl)).toBe(permanentAsset);
      expect(imageSet.findImage('/assets/conclusions/test.png')).not.toBeNull();
      expect(fetch).not.toHaveBeenCalledWith(requestedUrl);
    });

    it('chooses the first successful candidate and does not request later alternatives', async () => {
      const level = createDefaultMutableLevel();
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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
      const imageSet = await createImageSet();
      const loading = updateImageSetForLevel(level, imageSet);
      await firstRequested.promise;

      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/test.png');
      firstResponse.resolve(new Response(null, { status:404 }));
      await loading;
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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.findImage('/assets/conclusions/test.png')).toBeNull();
      expect(level.conclusions[0].parts[0]).toEqual({ type:ClozePartType.image, imageUrl:'/assets/bodies/test.png' });
    });

    it('reuses an already loaded direct candidate without probing earlier alternatives', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/bodies/test.png';
      level.conclusions = [_createImageConclusion(['/assets/conclusions/test.png', '/assets/bodies/test.png'])];

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow(
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

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow('/assets/backgrounds/missing.png');
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

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow(
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

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow('/assets/bodies/broken.png');
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

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow('/assets/bodies/torso.png');
    });

    it('keeps a loaded character image when its optional punch mask is absent', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [{ ...createDefaultCharacter(),
        rootBodyPart:replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/head.png') }];
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:String(url).endsWith('.punch.png') ? 404 : 200
      }));

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.findImage('/assets/bodies/head.png')?.punchMaskImage).toBeNull();
      expect(imageSet.findImage('/assets/bodies/head.png')?.image).toEqual({ width:1, height:1 });
    });

    it('rejects a missing non-character asset with its canonical URL', async () => {
      const level = createDefaultMutableLevel();
      level.backgroundImageUrl = '/assets/backgrounds/missing.png';
      vi.mocked(fetch).mockImplementation(async url => new Response(new Blob(), {
        status:url === '/castle-mystery/assets/backgrounds/missing.png' ? 404 : 200
      }));

      const imageSet = await createImageSet();
      await expect(updateImageSetForLevel(level, imageSet)).rejects.toThrow('/assets/backgrounds/missing.png');
    });

    it('keeps omitted character artwork headless while loading built-in assets', async () => {
      const level = createDefaultMutableLevel();
      level.characters = [createDefaultCharacter()];

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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
      const loading = createImageSet().then(async imageSet => {
        await updateImageSetForLevel(level, imageSet);
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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

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

      const imageSet = await createImageSet();
      await updateImageSetForLevel(level, imageSet);

      expect(imageSet.findImage('/assets/bodies/nested.png')).not.toBeNull();
      expect(fetch).not.toHaveBeenCalledWith('/castle-mystery/assets/bodies/head.png');
    });
  });
});