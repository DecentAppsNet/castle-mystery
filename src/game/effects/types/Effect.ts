import TakeItemEffect from "./TakeItemEffect";
import DropItemEffect from "./DropItemEffect";
import GiveItemEffect from "./GiveItemEffect";
import ItemDiscoveryEffect from "./ItemDiscoveryEffect";
import PlayEffect from "./PlayEffect";
import PauseEffect from "./PauseEffect";
import CharacterSelectEffect from "./CharacterSelectEffect";
import SpeechBubbleEffect from "./SpeechBubbleEffect";
import ThoughtBubbleEffect from "./ThoughtBubbleEffect";
import LockChangeEffect from "./LockChangeEffect";

type Effect = PlayEffect | PauseEffect | CharacterSelectEffect | SpeechBubbleEffect | ThoughtBubbleEffect | ItemDiscoveryEffect | TakeItemEffect | DropItemEffect | GiveItemEffect | LockChangeEffect;

export default Effect;
