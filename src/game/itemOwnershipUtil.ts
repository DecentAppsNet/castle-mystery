/* This module groups shared item-ownership helpers for inventory and hand-held item slots.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item from "./types/Item";
import ItemHoldLocation from "./types/ItemHoldLocation";

type ItemOwner = {
	items:Item[],
	leftHandItem:Item|null,
	rightHandItem:Item|null
};

export function getOwnedItems(owner:ItemOwner):Item[] {
	return [
		...owner.items,
		...(owner.leftHandItem ? [owner.leftHandItem] : []),
		...(owner.rightHandItem ? [owner.rightHandItem] : [])
	];
}

export function addOwnedItem(owner:ItemOwner, item:Item, location:ItemHoldLocation) {
	switch(location) {
		case 'inventory':
			owner.items.push(item);
			return;
		case 'left-hand':
			owner.leftHandItem = item;
			return;
		case 'right-hand':
			owner.rightHandItem = item;
			return;
	}
}

export function removeOwnedItemById(owner:ItemOwner, itemId:string):Item|null {
	if (owner.leftHandItem?.id === itemId) {
		const item = owner.leftHandItem;
		owner.leftHandItem = null;
		return item;
	}
  if (owner.rightHandItem?.id === itemId) {
		const item = owner.rightHandItem;
		owner.rightHandItem = null;
		return item;
	}

	const itemIndex = owner.items.findIndex(item => item.id === itemId);
	if (itemIndex === -1) return null;
	const [item] = owner.items.splice(itemIndex, 1);
	return item ?? null;
}