// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { renderRoomLayerCubeAscii, roomLayerViewToJsonObject } from '../roomLayerSerializeUtil';
import RoomLayerView from '../types/RoomLayerView';

const VIEW:RoomLayerView = {
  characterLabels:['Alice', 'Bob', 'Carol'],
  itemLabels:['Knife', 'Goblet'],
  rooms:[
    { roomId:'parlor', title:'Parlor', characterIndices:[0, 1], itemIndices:[0, 1], interactions:[{ characterIndex:0, itemIndex:0 }, { characterIndex:1, itemIndex:1 }] },
    { roomId:'cellar', title:'', characterIndices:[2], itemIndices:[], interactions:[] }
  ]
};

describe('roomLayerSerializeUtil', () => {
  describe('roomLayerViewToJsonObject()', () => {
    it('produces the stable automation contract shape', () => {
      const json = roomLayerViewToJsonObject(VIEW, 'lvl.md');
      expect(json.level).toBe('lvl.md');
      expect(json.characterLabels).toEqual(['Alice', 'Bob', 'Carol']);
      expect(json.itemLabels).toEqual(['Knife', 'Goblet']);
      expect(json.rooms).toEqual([
        { roomId:'parlor', title:'Parlor', characterIndices:[0, 1], itemIndices:[0, 1], interactions:[{ characterIndex:0, itemIndex:0 }, { characterIndex:1, itemIndex:1 }] },
        { roomId:'cellar', title:'', characterIndices:[2], itemIndices:[], interactions:[] }
      ]);
    });

    it('defaults the level name to null', () => {
      expect(roomLayerViewToJsonObject(VIEW).level).toBeNull();
    });
  });

  describe('renderRoomLayerCubeAscii()', () => {
    it('renders a header, legend, and one boxed layer per room', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW, 'lvl.md');
      expect(ascii).toContain('Room interaction cube — lvl.md');
      expect(ascii).toContain('Each layer is a room.');
      expect(ascii).toContain('Parlor');
      // The matrix marks Alice[0]xKnife[0] and Bob[1]xGoblet[1] as co-present, the off-diagonal as not.
      expect(ascii).toContain('[0] X .');
      expect(ascii).toContain('[1] . X');
    });

    it('falls back to the room id when a room is title-less, and renders no matrix for empty interaction sets', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW);
      expect(ascii).toContain('cellar'); // The title-less cellar shows its id instead of a blank.
      expect(ascii).not.toContain('(no character-item interactions)'); // The empty-room note widened the cube, so it was removed.
    });

    it('draws an isometric cube: a top face and right-face diagonals', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW);
      expect(ascii).toContain('/'); // Isometric edges.
      expect(ascii).toMatch(/\+-+\+/); // At least one horizontal border.
      // The top face's back edge is indented (shifted up-and-right) from the front face's left edge.
      const lines = ascii.split('\n');
      const backTopRow = lines.findIndex(line => line.trimStart().startsWith('+-'));
      expect(lines[backTopRow].indexOf('+')).toBeGreaterThan(0);
    });

    it('handles a view with no rooms', () => {
      const ascii = renderRoomLayerCubeAscii({ characterLabels:[], itemLabels:[], rooms:[] });
      expect(ascii).toContain('(no rooms)');
    });
  });
});
