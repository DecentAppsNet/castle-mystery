import Conclusion from '@/game/conclusions/types/Conclusion';
import AnswerSetIdToPieceStyleNoMap from './AnswerSetIdToPieceStyleNoMap';
import BookPageBase from './BookPageBase';

type ConclusionPage = BookPageBase<'conclusion'> & {
  conclusion:Conclusion, // Mutation of conclusions allowed.
  readonly answerSetIdToPieceStyleNoMap:AnswerSetIdToPieceStyleNoMap
}

export default ConclusionPage;