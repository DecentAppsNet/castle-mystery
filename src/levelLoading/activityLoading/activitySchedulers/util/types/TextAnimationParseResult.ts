import { PreparedAnimationText } from '@/game/textAnimations/types/PreparedAnimationText';

export type TextAnimationParseResult =
  | Readonly<{ success:true, preparedText:PreparedAnimationText }>
  | Readonly<{ success:false, message:string, utf16Offset:number }>;