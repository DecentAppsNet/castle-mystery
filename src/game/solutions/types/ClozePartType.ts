const ClozePartType = {
  blank:'blank',
  text:'text',
  image:'image',
  separator:'separator'
} as const;

type ClozePartType = typeof ClozePartType[keyof typeof ClozePartType];

export default ClozePartType;
