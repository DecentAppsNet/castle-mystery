import { describe, expect, it } from "vitest";

import {
  findCharacterOwnedItem,
  INVENTORY,
  LEFT_HAND,
  RIGHT_HAND
} from "../itemOwnershipUtil";
import { createDefaultItem } from "../types/Item";

const inventoryItem = { ...createDefaultItem(), id:'inventory-item' };
const leftHandItem = { ...createDefaultItem(), id:'left-hand-item' };
const rightHandItem = { ...createDefaultItem(), id:'right-hand-item' };
const owner = {
  items:[inventoryItem],
  leftHandItem,
  rightHandItem
};

describe('itemOwnershipUtil', () => {
  describe('findCharacterOwnedItem()', () => {
    it('finds an inventory item and its placement', () => {
      expect(findCharacterOwnedItem(owner, inventoryItem.id)).toEqual({ item:inventoryItem, placement:INVENTORY });
    });

    it('finds a left-hand item and its placement', () => {
      expect(findCharacterOwnedItem(owner, leftHandItem.id)).toEqual({ item:leftHandItem, placement:LEFT_HAND });
    });

    it('finds a right-hand item and its placement', () => {
      expect(findCharacterOwnedItem(owner, rightHandItem.id)).toEqual({ item:rightHandItem, placement:RIGHT_HAND });
    });

    it('returns null when the character does not own the item', () => {
      expect(findCharacterOwnedItem(owner, 'room-item')).toBeNull();
    });
  });
});