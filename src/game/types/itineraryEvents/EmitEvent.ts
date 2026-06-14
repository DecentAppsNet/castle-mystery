import ItineraryEventBase from "./ItineraryEventBase";

type EmitEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  emitText:string
}>

export function duplicateEmitEvent(from:EmitEvent):EmitEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    itemId:from.itemId,
    emitText:from.emitText,
    duration:from.duration
  };
}

export default EmitEvent;
