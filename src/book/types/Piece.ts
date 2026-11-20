import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookPage from './BookPage';

type Piece = {
  readonly conclusionId:string,
  placement:{ readonly page:Extract<BookPage, { kind:'conclusion' }>; readonly blank:ClozeBlank }|null,
  styleNo:number,
  text:string,
  xPercent:number, // Center X of piece expressed as a percentage of bookRect (both pages) width.
  yPercent:number // Center Y of piece expressed as a percentage of bookRect height.
}

export default Piece;