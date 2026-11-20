import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import Rect from '@/game/types/Rect';
import BookPage from '@/book/types/BookPage';

type PieceSlotLayout = {
  readonly page:Extract<BookPage, { kind:'conclusion' }>;
  readonly pageNo:number;
  readonly partIndex:number;
  readonly blank:ClozeBlank;
  readonly styleNo:number;
  readonly rect:Readonly<Rect>; // Normal displayed canvas rectangle, without feedback offsets or scaling.
};

export default PieceSlotLayout;