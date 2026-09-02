import Item, { duplicateItem } from "@/game/types/Item";
import Room, { createDefaultRoom } from "@/game/types/Room";
import RoomExit, { duplicateRoomExit } from "./RoomExit";

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

export const ROOM_KEYFRAME_KEYS = Object.keys(createDefaultRoomKeyframe());

export default RoomKeyframe;