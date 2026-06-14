import TakeItemEffect from "./TakeItemEffect";
import DropItemEffect from "./DropItemEffect";
import GiveItemEffect from "./GiveItemEffect";
import PlayEffect from "./PlayEffect";
import PauseEffect from "./PauseEffect";
import CharacterSelectEffect from "./CharacterSelectEffect";
import TalkingEffect from "./TalkingEffect";
import ThinkingEffect from "./ThinkingEffect";
import SpeechBubbleEffect from "./SpeechBubbleEffect";
import EmitBubbleEffect from "./EmitBubbleEffect";
import ThoughtBubbleEffect from "./ThoughtBubbleEffect";
import LockChangeEffect from "./LockChangeEffect";

type Effect = PlayEffect | PauseEffect | CharacterSelectEffect | TalkingEffect | ThinkingEffect | SpeechBubbleEffect | EmitBubbleEffect | ThoughtBubbleEffect | TakeItemEffect | DropItemEffect | GiveItemEffect | LockChangeEffect;

export default Effect;
