import LevelManifest from '@/levelLoading/types/LevelManifest';
import PreparedLevelState from './PreparedLevelState';

type InitResults = PreparedLevelState & {
  minutes:number;
  levelManifest:LevelManifest;
};

export default InitResults;