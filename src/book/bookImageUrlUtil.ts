/* This file collects resolved conclusion-page image URLs for book asset retention without loading assets.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import ClozeImage from '@/game/conclusions/types/ClozeImage';
import ClozePartType from '@/game/conclusions/types/ClozePartType';
import BookState from './types/BookState';

export function findBookImageUrls(bookState:BookState):ReadonlySet<string> {
  const imageUrls = new Set<string>();
  for (const page of bookState.pages) {
    if (page.kind !== 'conclusion') continue;
    for (const part of page.conclusion.parts) {
      if (part.type !== ClozePartType.image) continue;
      const { imageUrl } = part as ClozeImage;
      assert(typeof imageUrl === 'string', 'Book image URLs must already be resolved.');
      imageUrls.add(imageUrl);
    }
  }
  return imageUrls;
}