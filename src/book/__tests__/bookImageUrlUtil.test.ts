import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findBookImageUrls } from '@/book';
import { createDefaultBookState } from '../types/BookState';
import Conclusion from '@/game/conclusions/types/Conclusion';
import ClozePartType from '@/game/conclusions/types/ClozePartType';

const emptyConclusion:Conclusion = {
  id:'test', title:'Test', parts:[], isComplete:false, isLocked:false, isOptional:false,
  incorrectGuessCount:0, unlockConclusionIds:[], revealRoomIds:[]
};

describe('bookImageUrlUtil', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('createImageBitmap', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('findBookImageUrls()', () => {
    it('returns an empty set for a book without pages', () => {
      expect(findBookImageUrls(createDefaultBookState())).toEqual(new Set());
    });

    it('returns no URLs for pages without image parts', () => {
      const bookState = createDefaultBookState();
      const conclusion = { ...emptyConclusion, parts:[{ type:ClozePartType.text, text:'No artwork.' }] };
      bookState.pages = [
        { kind:'blank', headingText:'', chapterNo:0 },
        { kind:'bookStart', headingText:'', chapterNo:0, title:'Book', subtitle:null, author:'Author' },
        { kind:'chapterStart', headingText:'', chapterNo:1, title:'Chapter', description:'' },
        { kind:'conclusion', headingText:'', chapterNo:1, conclusion, answerSetIdToPieceStyleNoMap:{} }
      ];

      expect(findBookImageUrls(bookState)).toEqual(new Set());
    });

    it('deduplicates repeated URLs within and across conclusion pages', () => {
      const bookState = createDefaultBookState();
      const conclusion = { ...emptyConclusion, parts:[
        { type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' },
        { type:ClozePartType.image, imageUrl:'/assets/bodies/shared.png' }
      ] };
      bookState.pages = [
        { kind:'conclusion', headingText:'', chapterNo:1, conclusion, answerSetIdToPieceStyleNoMap:{} },
        { kind:'conclusion', headingText:'', chapterNo:2, conclusion, answerSetIdToPieceStyleNoMap:{} },
        { kind:'tally', headingText:'', chapterNo:2, conclusions:[conclusion] }
      ];

      expect(findBookImageUrls(bookState)).toEqual(new Set(['/assets/bodies/shared.png']));
    });

    it('collects canonical references from multiple chapters without loading assets or changing pages', () => {
      const bookState = createDefaultBookState();
      const firstConclusion = { ...emptyConclusion, parts:[{ type:ClozePartType.image, imageUrl:'/assets/bodies/first.png' }] };
      const secondConclusion = { ...emptyConclusion, id:'second', parts:[{ type:ClozePartType.image, imageUrl:'/assets/conclusions/second.png' }] };
      bookState.pages = [
        { kind:'conclusion', headingText:'', chapterNo:1, conclusion:firstConclusion, answerSetIdToPieceStyleNoMap:{} },
        { kind:'conclusion', headingText:'', chapterNo:2, conclusion:secondConclusion, answerSetIdToPieceStyleNoMap:{} }
      ];
      const pagesBefore = structuredClone(bookState.pages);

      expect(findBookImageUrls(bookState)).toEqual(new Set(['/assets/bodies/first.png', '/assets/conclusions/second.png']));
      expect(bookState.pages).toEqual(pagesBefore);
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it('asserts for unresolved book references without probing candidates', () => {
      const bookState = createDefaultBookState();
      const conclusion = { ...emptyConclusion, parts:[{ type:ClozePartType.image,
        imageUrl:['/assets/conclusions/test.png', '/assets/bodies/test.png'] }] };
      bookState.pages = [{ kind:'conclusion', headingText:'', chapterNo:1, conclusion, answerSetIdToPieceStyleNoMap:{} }];

      expect(() => findBookImageUrls(bookState)).toThrow();
      expect(fetch).not.toHaveBeenCalled();
      expect(createImageBitmap).not.toHaveBeenCalled();
    });
  });
});