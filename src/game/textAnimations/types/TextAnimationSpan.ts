import { TextAnimationName } from './TextAnimationName';

/** A marked span within the complete visible text, with graphemes prepared for animation. */
export type TextAnimationSpan = Readonly<{
  name:TextAnimationName,
  startUtf16Offset:number, // Inclusive offset to start of this span's text within the complete plain text message.
  endUtf16Offset:number, // Exclusive offset to this span's text within the complete plain text message.
  text:string,
  graphemes:readonly string[] // Span-local grapheme clusters, including whitespace; one cluster may contain multiple code points and UTF-16 code units.
}>;