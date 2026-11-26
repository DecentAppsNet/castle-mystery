import ClozeBlank from './ClozeBlank';
import ClozeImage from './ClozeImage';
import ClozeSeparator from './ClozeSeparator';
import ClozeText from './ClozeText';

type ClozePart = ClozeBlank | ClozeText | ClozeImage | ClozeSeparator;

export default ClozePart;