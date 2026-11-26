import Conclusion from '@/game/conclusions/types/Conclusion';
import AnswerSetIdToPieceStyleNoMap from './AnswerSetIdToPieceStyleNoMap';
import BookPageBase from './BookPageBase';
import ClozePartLayoutTweak from './ClozePartLayoutTweak';

type ConclusionPage = BookPageBase<'conclusion'> & {
  readonly levelUrl:string,
  conclusion:Conclusion, // Mutation of conclusions allowed.
  readonly answerSetIdToPieceStyleNoMap:AnswerSetIdToPieceStyleNoMap,
  readonly layoutTweaks:Array<ClozePartLayoutTweak|null>
}

export default ConclusionPage;