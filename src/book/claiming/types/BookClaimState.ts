import ClozeBlank from '@/game/conclusions/types/ClozeBlank';
import BookPage from '@/book/types/BookPage';

type BookClaimState = {
  readonly conclusionPageI:number;
  readonly page:Extract<BookPage, { kind:'conclusion' }>;
  readonly blanks:readonly ClozeBlank[];
  readonly startedAt:number;
  readonly correct:boolean;
  resultApplied:boolean;
  ejectedCount:number;
};

export default BookClaimState;