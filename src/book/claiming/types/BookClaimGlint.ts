import ClozeBlank from '@/conclusions/types/ClozeBlank';
import BookPage from '@/book/types/BookPage';

type BookClaimGlint = {
  readonly page:Extract<BookPage, { kind:'conclusion' }>;
  readonly blank:ClozeBlank;
  readonly angle:number;
};

export default BookClaimGlint;