import Conclusion from '@/conclusions/types/Conclusion';
import BookPageBase from './BookPageBase';

type TallyPage = BookPageBase<'tally'> & {
  conclusions:readonly Readonly<Conclusion>[],
}

export default TallyPage;