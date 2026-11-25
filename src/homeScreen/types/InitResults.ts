import PreparedLevelState from './PreparedLevelState';
import BookState from '@/book/types/BookState';

type InitResults = PreparedLevelState & {
  bookState:BookState;
  minutes:number;
};

export default InitResults;