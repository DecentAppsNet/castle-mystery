/* This module groups the cloze-image model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { CandidateUrls } from '@/game/imageUrlUtil';
import ClozePartBase from './ClozePartBase';

type ClozeImage = Readonly<ClozePartBase & {
  imageUrl: string|CandidateUrls;
}>;

export function duplicateClozeImage(from:ClozeImage):ClozeImage {
  return {
    type:from.type,
    imageUrl:from.imageUrl
  };
}

export default ClozeImage;