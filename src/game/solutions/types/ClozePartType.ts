/* This module groups cloze-part type values used across solution rendering and editing.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

const ClozePartType = {
  blank:'blank',
  text:'text',
  image:'image',
  separator:'separator'
} as const;

type ClozePartType = typeof ClozePartType[keyof typeof ClozePartType];

export default ClozePartType;
