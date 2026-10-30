import Character from '@/game/types/Character';
import Room from '@/game/types/Room';
import PointTarget from './PointTarget';

type PointStartSnapshot = Readonly<{
  subject:Character,
  room:Room,
  characters:readonly Character[],
  movingCharacterIds:ReadonlySet<string>,
  target:PointTarget|Readonly<{ kind:'heldItem', holderId:string }>
}>;

export default PointStartSnapshot;