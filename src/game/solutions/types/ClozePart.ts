import ClozeBlank, { duplicateClozeBlank } from './ClozeBlank';
import ClozeImage, { duplicateClozeImage } from './ClozeImage';
import ClozeSeparator, { duplicateClozeSeparator } from './ClozeSeparator';
import ClozeText, { duplicateClozeText } from './ClozeText';
import ClozePartType from './ClozePartType';

type ClozePart = ClozeBlank | ClozeText | ClozeImage | ClozeSeparator;

export function duplicateClozePart(from:ClozePart):ClozePart {
  if (from.type === ClozePartType.text) {
    return duplicateClozeText(from as ClozeText);
  }
  if (from.type === ClozePartType.image) {
    return duplicateClozeImage(from as ClozeImage);
  }
  if (from.type === ClozePartType.separator) {
    return duplicateClozeSeparator(from as ClozeSeparator);
  }
  return duplicateClozeBlank(from as ClozeBlank);
}

export default ClozePart;
