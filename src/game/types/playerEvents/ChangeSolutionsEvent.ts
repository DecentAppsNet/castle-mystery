import Solution from "../../solutions/types/Solution";
import PlayerEventBase from "./PlayerEventBase";

type ChangeSolutionsEvent = Readonly<PlayerEventBase & {
  solutions:Solution[]
}>

export default ChangeSolutionsEvent;