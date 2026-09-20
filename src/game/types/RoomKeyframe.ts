import Item, { areItemsEqual, duplicateItem } from "@/game/types/Item";
import Room, { createDefaultRoom } from "@/game/types/Room";
import RoomExit, { areRoomExitsEqual, duplicateRoomExit } from "./RoomExit";

type RoomKeyframe = {
  items: Item[],
  exits: RoomExit[]
};

const DEFAULT_ROOM:Readonly<Room> = createDefaultRoom();

export function createDefaultRoomKeyframe():RoomKeyframe {
  return { items:DEFAULT_ROOM.items, exits:DEFAULT_ROOM.exits };
}

export function duplicateRoomKeyframe(from:RoomKeyframe) {
  return { 
    items:from.items.map(duplicateItem),
    exits:from.exits.map(duplicateRoomExit)
  };
}

export function areRoomKeyframesEqual(a:RoomKeyframe, b:RoomKeyframe):boolean {
  if (a === b) return true;
  return (a.items.length === b.items.length &&
    a.items.every((item, i) => areItemsEqual(item, b.items[i])) &&
    a.exits.length === b.exits.length &&
    a.exits.every((exit, i) => areRoomExitsEqual(exit, b.exits[i]))
  );
}

export const ROOM_KEYFRAME_KEYS = Object.keys(createDefaultRoomKeyframe());

export default RoomKeyframe;