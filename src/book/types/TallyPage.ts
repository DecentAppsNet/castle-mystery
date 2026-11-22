import Conclusion from '@/game/conclusions/types/Conclusion';
import BookPageBase from './BookPageBase';

type TallyPage = BookPageBase<'tally'> & {
  conclusions:readonly Readonly<Conclusion>[],
  winSynopsis:string
}

export default TallyPage;