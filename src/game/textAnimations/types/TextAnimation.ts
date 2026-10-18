import { LetterTransform } from './LetterTransform';

export type TextAnimation = (text:string, letterI:number, metaTime:number) => Partial<LetterTransform>;