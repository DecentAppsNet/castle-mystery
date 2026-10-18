import { TextAnimationSpan } from './TextAnimationSpan';

export type PreparedAnimationText = Readonly<{
  plainText:string,
  spans:readonly TextAnimationSpan[]
}>;