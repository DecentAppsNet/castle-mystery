import ClozeBlank, { duplicateClozeBlank } from './ClozeBlank';
import ClozeText, { duplicateClozeText } from './ClozeText';
import ClozePartType from './ClozePartType';

type ClozePart = ClozeBlank | ClozeText;

export function duplicateClozePart(from:ClozePart):ClozePart {
  if (from.type === ClozePartType.text) {
    return duplicateClozeText(from as ClozeText);
  }
  return duplicateClozeBlank(from as ClozeBlank);
}

export default ClozePart;
