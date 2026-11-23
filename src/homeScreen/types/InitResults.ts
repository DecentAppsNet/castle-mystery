import LevelManifest from '@/levelLoading/types/LevelManifest';
import PreparedLevelState from './PreparedLevelState';
import BookState from '@/book/types/BookState';

type InitResults = PreparedLevelState & {
  bookState:BookState;
  minutes:number;
  levelManifest:LevelManifest;
};

export default InitResults;