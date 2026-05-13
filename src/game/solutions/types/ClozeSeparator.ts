import ClozePartBase from './ClozePartBase';

type ClozeSeparator = Readonly<ClozePartBase>;

export function duplicateClozeSeparator(from:ClozeSeparator):ClozeSeparator {
  return {
    type:from.type
  };
}

export default ClozeSeparator;