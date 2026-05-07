import TakeItemEffect from "./TakeItemEffect";
import DropItemEffect from "./DropItemEffect";
import GiveItemEffect from "./GiveItemEffect";
import ItemDiscoveryEffect from "./ItemDiscoveryEffect";
import PlayEffect from "./PlayEffect";
import PauseEffect from "./PauseEffect";

type Effect = PlayEffect | PauseEffect | ItemDiscoveryEffect | TakeItemEffect | DropItemEffect | GiveItemEffect;

export default Effect;
