import PreparedLevelState from './PreparedLevelState';
import BookState from '@/book/types/BookState';

type InitResults = PreparedLevelState & {
  bookState:BookState;
  bookUrl:string;
  bookLoadKind:'fresh'|'restored'|'unsupportedVersion';
  minutes:number;
};

export default InitResults;