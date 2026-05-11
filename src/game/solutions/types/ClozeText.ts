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
