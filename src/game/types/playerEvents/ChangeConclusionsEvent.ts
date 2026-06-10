import Conclusion from "@/game/conclusions/types/Conclusion";
import PlayerEventBase from "./PlayerEventBase";

type ChangeConclusionsEvent = Readonly<PlayerEventBase & {
  conclusions:Conclusion[]
}>

export default ChangeConclusionsEvent;