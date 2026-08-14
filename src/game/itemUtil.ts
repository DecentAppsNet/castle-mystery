/* This module groups item-indexing and shared room or character item-duplication helpers.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Character, { duplicateCharacter } from "./types/Character";
import Item, { duplicateItem } from "./types/Item";
import Room, { duplicateRoom } from "./types/Room";

function _findIndexedItem(itemsById:ReadonlyMap<string, Item>, itemId:string):Item {
	const item = itemsById.get(itemId) || null;
	if (!item) throw new Error(`item ${itemId} not found in index`);
	return item;
}

export function createItemsById(rooms:ReadonlyArray<Pick<Room, 'items'>>,
	characters:ReadonlyArray<Pick<Character, 'items' | 'leftHandItem' | 'rightHandItem'>>,
	fallbackItemsById:ReadonlyMap<string, Item> = new Map()):Map<string, Item> {
	const itemsById = new Map<string, Item>(fallbackItemsById.entries());
	rooms.forEach(room => room.items.forEach(item => itemsById.set(item.id, item)));
	characters.forEach(character => {
		character.items.forEach(item => itemsById.set(item.id, item));
		if (character.leftHandItem) itemsById.set(character.leftHandItem.id, character.leftHandItem);
		if (character.rightHandItem) itemsById.set(character.rightHandItem.id, character.rightHandItem);
	});
	return itemsById;
}

export function duplicateItemsById(itemsById:ReadonlyMap<string, Item>):Map<string, Item> {
	return new Map(Array.from(itemsById.entries()).map(([itemId, item]) => [itemId, duplicateItem(item)]));
}

export function duplicateCharacterUsingItemIndex(from:Character, itemsById:ReadonlyMap<string, Item>):Character {
	const character = duplicateCharacter(from);
	character.items = from.items.map(item => _findIndexedItem(itemsById, item.id));
	character.leftHandItem = from.leftHandItem ? _findIndexedItem(itemsById, from.leftHandItem.id) : null;
	character.rightHandItem = from.rightHandItem ? _findIndexedItem(itemsById, from.rightHandItem.id) : null;
	return character;
}

export function duplicateRoomUsingItemIndex(from:Room, itemsById:ReadonlyMap<string, Item>):Room {
	const room = duplicateRoom(from);
	room.items = from.items.map(item => _findIndexedItem(itemsById, item.id));
	return room;
}