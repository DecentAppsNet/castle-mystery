import { CandidateUrls } from '@/game/imageUrlUtil';
import ClozePartBase from './ClozePartBase';

type ClozeImage = Readonly<ClozePartBase & {
  imageUrl: string|CandidateUrls;
}>;

export default ClozeImage;