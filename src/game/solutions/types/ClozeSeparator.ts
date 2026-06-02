/* This module groups the cloze-separator model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ClozePartBase from './ClozePartBase';

type ClozeSeparator = Readonly<ClozePartBase>;

export function duplicateClozeSeparator(from:ClozeSeparator):ClozeSeparator {
  return {
    type:from.type
  };
}

export default ClozeSeparator;