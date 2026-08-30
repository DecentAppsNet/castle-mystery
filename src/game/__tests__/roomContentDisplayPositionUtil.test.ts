import { describe, expect, it } from 'vitest';

import { ITEM_CUBOID_HEIGHT_GAME } from '../itemSizeUtil';
import { createRoomContentDisplayLayout } from '../roomContentDisplayPositionUtil';
import Character, { createDefaultCharacter } from '../types/Character';
import Item, { createDefaultItem } from '../types/Item';
import Position from '../types/Position';
import { createDefaultRoom } from '../types/Room';

const FLOOR_Y = 39.999;
const LEFT_SQUARE = { x:12.5, y:FLOOR_Y, z:0.5 };
const RIGHT_SQUARE = { x:17.5, y:FLOOR_Y, z:0.5 };

function _createItem(id:string, position:Position = LEFT_SQUARE, drawOffset:Position = { x:0, y:0, z:0 },
    stackOffset:Position = { x:0, y:0, z:0 }, isVisible = true):Item {
  return { ...createDefaultItem(), id, position:{...position}, drawOffset:{...drawOffset}, stackOffset:{...stackOffset}, isVisible };
}

function _createCharacter(id:string, position:Position = LEFT_SQUARE):Character {
  return { ...createDefaultCharacter(), id, position:{...position} };
}

function _createRoom(items:Item[]) {
  return { ...createDefaultRoom(), rect:{ x:10, y:20, width:20, height:20 }, items };
}

function _expectPosition(actual:Position, expected:Position):void {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.z).toBeCloseTo(expected.z);
}

describe('roomContentDisplayPositionUtil', () => {
  describe('createRoomContentDisplayLayout()', () => {
    it('applies an item draw offset to itself but its stack offset only to later content', () => {
      const item = _createItem('table', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const entry = createRoomContentDisplayLayout(_createRoom([item]), []).itemLayoutById.get(item.id)!;

      expect(entry.displayPosition).toEqual({ x:13.5, y:37.999, z:0.6 });
      expect(entry.painterOrderAnchor).toEqual(entry.displayPosition);
      expect(entry.stackMemberI).toBe(0);
    });

    it('stacks three items in array order with cumulative implicit heights and offsets', () => {
      const bottom = _createItem('bottom', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const middle = _createItem('middle', LEFT_SQUARE, { x:-1, y:-1, z:-0.1 }, { x:2, y:-3, z:0.3 });
      const top = _createItem('top');
      const room = _createRoom([bottom, middle, top]);
      const layout = createRoomContentDisplayLayout(room, []);
      const height = ITEM_CUBOID_HEIGHT_GAME;

      _expectPosition(layout.itemLayoutById.get('middle')!.displayPosition, {
        x:LEFT_SQUARE.x + 1 + 3 - 1,
        y:FLOOR_Y - 2 - 4 - height - 1,
        z:LEFT_SQUARE.z + 0.1 + 0.2 - 0.1
      });
      _expectPosition(layout.itemLayoutById.get('top')!.displayPosition, {
        x:LEFT_SQUARE.x + 1 + 3 - 1 + 2,
        y:FLOOR_Y - 2 - 4 - height - 1 - 3 - height,
        z:LEFT_SQUARE.z + 0.1 + 0.2 - 0.1 + 0.3
      });
      expect(['bottom', 'middle', 'top'].map(id => layout.itemLayoutById.get(id)!.stackMemberI)).toEqual([0, 1, 2]);
      expect(layout.itemLayoutById.get('top')!.painterOrderAnchor).toEqual(layout.itemLayoutById.get('bottom')!.displayPosition);
    });

    it('excludes an invisible item and all of its support contributions', () => {
      const bottom = _createItem('bottom', LEFT_SQUARE, { x:1, y:0, z:0 }, { x:2, y:0, z:0 });
      const hidden = _createItem('hidden', LEFT_SQUARE, { x:20, y:20, z:20 }, { x:20, y:20, z:20 }, false);
      const top = _createItem('top');
      const room = _createRoom([bottom, hidden, top]);
      const layout = createRoomContentDisplayLayout(room, []);

      expect(layout.itemLayoutById.has('hidden')).toBe(false);
      _expectPosition(layout.itemLayoutById.get('top')!.displayPosition, {
        x:LEFT_SQUARE.x + 3,
        y:FLOOR_Y - ITEM_CUBOID_HEIGHT_GAME,
        z:LEFT_SQUARE.z
      });
      expect(layout.itemLayoutById.get('top')!.stackMemberI).toBe(1);
    });

    it('maintains independent support transforms for different squares', () => {
      const left = _createItem('left', LEFT_SQUARE, { x:2, y:-3, z:0.1 }, { x:4, y:-5, z:0.2 });
      const right = _createItem('right', RIGHT_SQUARE, { x:-1, y:-2, z:-0.1 });
      const layout = createRoomContentDisplayLayout(_createRoom([left, right]), []);

      expect(layout.itemLayoutById.get('right')!.displayPosition).toEqual({ x:16.5, y:37.999, z:0.4 });
      expect(layout.itemLayoutById.get('right')!.stackMemberI).toBe(0);
    });

    it('places a character above every visible item support contribution', () => {
      const bottom = _createItem('bottom', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const top = _createItem('top', LEFT_SQUARE, { x:-1, y:-1, z:-0.1 }, { x:2, y:-3, z:0.3 });
      const character = _createCharacter('sam');
      const room = _createRoom([bottom, top]);
      const entry = createRoomContentDisplayLayout(room, [character]).characterLayoutById.get(character.id)!;
      const height = ITEM_CUBOID_HEIGHT_GAME;

      _expectPosition(entry.displayPosition, {
        x:LEFT_SQUARE.x + 1 + 3 - 1 + 2,
        y:FLOOR_Y - 2 - 4 - height - 1 - 3 - height,
        z:LEFT_SQUARE.z + 0.1 + 0.2 - 0.1 + 0.3
      });
      expect(entry.stackMemberI).toBe(2);
    });

    it('gives same-square characters equal transforms without using either as support', () => {
      const item = _createItem('table', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const sam = _createCharacter('sam');
      const pat = _createCharacter('pat');
      const layout = createRoomContentDisplayLayout(_createRoom([item]), [sam, pat]);
      const samEntry = layout.characterLayoutById.get('sam')!;
      const patEntry = layout.characterLayoutById.get('pat')!;

      expect(patEntry.displayPosition).toEqual(samEntry.displayPosition);
      expect([samEntry.stackMemberI, patEntry.stackMemberI]).toEqual([1, 2]);
      expect(patEntry.painterOrderAnchor).toEqual(samEntry.painterOrderAnchor);
    });

    it('switches the support transform across a midpoint without snapping the character base position', () => {
      const item = _createItem('table');
      const leftCharacter = _createCharacter('left', { x:14.999, y:FLOOR_Y, z:0.5 });
      const rightCharacter = _createCharacter('right', { x:15.001, y:FLOOR_Y, z:0.5 });
      const room = _createRoom([item]);
      const layout = createRoomContentDisplayLayout(room, [leftCharacter, rightCharacter]);

      _expectPosition(layout.characterLayoutById.get('left')!.displayPosition, {
        x:14.999, y:FLOOR_Y - ITEM_CUBOID_HEIGHT_GAME, z:0.5
      });
      expect(layout.characterLayoutById.get('right')!.displayPosition).toEqual(rightCharacter.position);
      expect(layout.characterLayoutById.get('right')!.squarePosition).toEqual(RIGHT_SQUARE);
    });

    it('uses a shared anchor for a nonempty stack and a character display position for an empty square', () => {
      const bottom = _createItem('bottom', LEFT_SQUARE, { x:1, y:-2, z:0.1 });
      const top = _createItem('top');
      const supported = _createCharacter('supported');
      const unsupported = _createCharacter('unsupported', RIGHT_SQUARE);
      const layout = createRoomContentDisplayLayout(_createRoom([bottom, top]), [supported, unsupported]);
      const anchor = layout.itemLayoutById.get('bottom')!.displayPosition;

      expect(layout.itemLayoutById.get('top')!.painterOrderAnchor).toEqual(anchor);
      expect(layout.characterLayoutById.get('supported')!.painterOrderAnchor).toEqual(anchor);
      expect(layout.characterLayoutById.get('unsupported')!.painterOrderAnchor).toEqual(unsupported.position);
    });

    it('finds a prospective item position on an empty destination square', () => {
      const candidate = _createItem('candidate', LEFT_SQUARE, { x:1, y:-2, z:0.25 });
      const layout = createRoomContentDisplayLayout(_createRoom([]), []);

      expect(layout.findProspectiveItemDisplayPosition(candidate, RIGHT_SQUARE))
        .toEqual({ x:18.5, y:37.999, z:0.75 });
    });

    it('finds a prospective item position above all visible support contributions', () => {
      const bottom = _createItem('bottom', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const top = _createItem('top', LEFT_SQUARE, { x:-1, y:-1, z:-0.1 }, { x:2, y:-3, z:0.3 });
      const candidate = _createItem('candidate', RIGHT_SQUARE, { x:0.5, y:-0.5, z:0.05 });
      const layout = createRoomContentDisplayLayout(_createRoom([bottom, top]), []);

      _expectPosition(layout.findProspectiveItemDisplayPosition(candidate, LEFT_SQUARE), {
        x:LEFT_SQUARE.x + 1 + 3 - 1 + 2 + 0.5,
        y:FLOOR_Y - 2 - 4 - ITEM_CUBOID_HEIGHT_GAME - 1 - 3 - ITEM_CUBOID_HEIGHT_GAME - 0.5,
        z:LEFT_SQUARE.z + 0.1 + 0.2 - 0.1 + 0.3 + 0.05
      });
    });

    it('ignores invisible supports for a prospective item position', () => {
      const hidden = _createItem('hidden', LEFT_SQUARE, { x:20, y:20, z:20 }, { x:20, y:20, z:20 }, false);
      const candidate = _createItem('candidate');
      const layout = createRoomContentDisplayLayout(_createRoom([hidden]), []);

      expect(layout.findProspectiveItemDisplayPosition(candidate, LEFT_SQUARE)).toEqual(LEFT_SQUARE);
    });

    it("applies the prospective item's draw offset but not its stack offset", () => {
      const candidate = _createItem('candidate', LEFT_SQUARE, { x:1, y:-2, z:0.25 }, { x:30, y:40, z:50 });
      const layout = createRoomContentDisplayLayout(_createRoom([]), []);

      expect(layout.findProspectiveItemDisplayPosition(candidate, LEFT_SQUARE))
        .toEqual({ x:13.5, y:37.999, z:0.75 });
    });

    it('does not mutate inputs or existing layout entries when finding a prospective position', () => {
      const support = _createItem('support');
      const candidate = _createItem('candidate', RIGHT_SQUARE, { x:1, y:-2, z:0.25 });
      const character = _createCharacter('sam');
      const room = _createRoom([support]);
      const layout = createRoomContentDisplayLayout(room, [character]);
      const itemEntry = layout.itemLayoutById.get(support.id);
      const characterEntry = layout.characterLayoutById.get(character.id);
      const before = JSON.stringify({ room, candidate, character, itemEntry, characterEntry });

      layout.findProspectiveItemDisplayPosition(candidate, LEFT_SQUARE);

      expect(JSON.stringify({ room, candidate, character, itemEntry, characterEntry })).toBe(before);
      expect(layout.itemLayoutById.size).toBe(1);
      expect(layout.characterLayoutById.size).toBe(1);
    });

    it('does not mutate room items or characters', () => {
      const item = _createItem('table', LEFT_SQUARE, { x:1, y:-2, z:0.1 }, { x:3, y:-4, z:0.2 });
      const character = _createCharacter('sam', { x:14.999, y:FLOOR_Y, z:0.5 });
      const room = _createRoom([item]);
      const before = JSON.stringify({ room, character });

      createRoomContentDisplayLayout(room, [character]);

      expect(JSON.stringify({ room, character })).toBe(before);
    });
  });
});