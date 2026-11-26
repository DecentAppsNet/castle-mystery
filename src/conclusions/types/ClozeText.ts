import ClozePartBase from './ClozePartBase';

type ClozeText = Readonly<ClozePartBase & {
  text: string;
}>;

export default ClozeText;