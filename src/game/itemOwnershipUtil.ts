/* This file groups shared item-ownership helpers for inventory and hand-held item slots.
	If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Item from "./types/Item";

export const LEFT_HAND = 'left hand';
export const RIGHT_HAND = 'right hand';
export const INVENTORY = 'inventory';
export type CharacterOwnedItemPlacement = typeof LEFT_HAND|typeof RIGHT_HAND|typeof INVENTORY;

type ItemOwner = {
	items:Item[],
	leftHandItem:Item|null,
	rightHandItem:Item|null
};

type CharacterOwnedItem = {
	item:Item,
	placement:CharacterOwnedItemPlacement
};

export function findCharacterOwnedItem(owner:ItemOwner, itemId:string):CharacterOwnedItem|null {
	if (owner.leftHandItem?.id === itemId) return { item:owner.leftHandItem, placement:LEFT_HAND };
	if (owner.rightHandItem?.id === itemId) return { item:owner.rightHandItem, placement:RIGHT_HAND };
	const item = owner.items.find(candidate => candidate.id === itemId);
	return item ? { item, placement:INVENTORY } : null;
}

export function getOwnedItems(owner:ItemOwner):Item[] {
	return [
		...owner.items,
		...(owner.leftHandItem ? [owner.leftHandItem] : []),
		...(owner.rightHandItem ? [owner.rightHandItem] : [])
	];
}