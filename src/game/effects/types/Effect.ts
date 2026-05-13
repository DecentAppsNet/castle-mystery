import TakeItemEffect from "./TakeItemEffect";
import DropItemEffect from "./DropItemEffect";
import GiveItemEffect from "./GiveItemEffect";
import ItemDiscoveryEffect from "./ItemDiscoveryEffect";
import PlayEffect from "./PlayEffect";
import PauseEffect from "./PauseEffect";
import CharacterSelectEffect from "./CharacterSelectEffect";

type Effect = PlayEffect | PauseEffect | CharacterSelectEffect | ItemDiscoveryEffect | TakeItemEffect | DropItemEffect | GiveItemEffect;

export default Effect;
