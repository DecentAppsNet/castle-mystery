import TakeItemEffect from "./TakeItemEffect";
import DropItemEffect from "./DropItemEffect";
import GiveItemEffect from "./GiveItemEffect";
import ItemDiscoveryEffect from "./ItemDiscoveryEffect";

type Effect = ItemDiscoveryEffect | TakeItemEffect | DropItemEffect | GiveItemEffect;

export default Effect;
