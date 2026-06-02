/* This module groups the cloze-text model and its duplication helper.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import ClozePartBase from './ClozePartBase';

type ClozeText = Readonly<ClozePartBase & {
  text: string;
}>;

export function duplicateClozeText(from:ClozeText):ClozeText {
  return {
    type:from.type,
    text:from.text
  };
}

export default ClozeText;
