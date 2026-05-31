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