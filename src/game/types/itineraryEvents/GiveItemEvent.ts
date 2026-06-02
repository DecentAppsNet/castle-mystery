import ItineraryEventBase from "./ItineraryEventBase";

type GiveItemEvent = Readonly<ItineraryEventBase & {
  itemId:string,
  recipientCharacterId:string
}>

export function duplicateGiveItemEvent(from:GiveItemEvent):GiveItemEvent {
  return {
    type:from.type,
    startTime:from.startTime,
    duration:from.duration,
    itemId:from.itemId,
    recipientCharacterId:from.recipientCharacterId
  };
}

export default GiveItemEvent;
