/* This module groups shared item-ownership helpers for inventory and hand-held item slots.
	If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Item from "./types/Item";

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