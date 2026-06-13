// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { renderRoomLayerCubeAscii, roomLayerViewToJsonObject } from '../roomLayerSerializeUtil';
import RoomLayerView from '../types/RoomLayerView';

const NINE_OH_FIVE = (9 * 60 + 5) * 60_000;   // 09:05
const THIRTEEN_THIRTY = (13 * 60 + 30) * 60_000; // 13:30

const VIEW:RoomLayerView = {
  characterLabels:['Alice', 'Bob', 'Carol'],
  itemLabels:['Knife', 'Goblet'],
  rooms:[
    { roomId:'parlor', title:'Parlor', characterIndices:[0, 1], itemIndices:[0, 1], interactions:[
      { characterIndex:0, itemIndex:0, firstInteractionTime:NINE_OH_FIVE },
      { characterIndex:1, itemIndex:1, firstInteractionTime:THIRTEEN_THIRTY }
    ] },
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
        { roomId:'parlor', title:'Parlor', characterIndices:[0, 1], itemIndices:[0, 1], interactions:[
          { characterIndex:0, itemIndex:0, firstInteractionTime:NINE_OH_FIVE },
          { characterIndex:1, itemIndex:1, firstInteractionTime:THIRTEEN_THIRTY }
        ] },
        { roomId:'cellar', title:'', characterIndices:[2], itemIndices:[], interactions:[] }
      ]);
    });

    it('defaults the level name to null', () => {
      expect(roomLayerViewToJsonObject(VIEW).level).toBeNull();
    });
  });

  describe('renderRoomLayerCubeAscii()', () => {
    it('renders a header, legend, and the first-interaction times in the matrix', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW, 'lvl.md');
      expect(ascii).toContain('Room interaction cube — lvl.md');
      expect(ascii).toContain('Each layer is a room.');
      expect(ascii).toContain('Parlor');
      // Alice[0] met Knife[0] at 09:05 and Bob[1] met Goblet[1] at 13:30; the off-diagonal cells are blank.
      expect(ascii).toContain('09:05');
      expect(ascii).toContain('13:30');
      expect(ascii).toMatch(/\[0\] +09:05/); // Time sits in the first (Knife) column of Alice's row.
    });

    it('shows index numbers on both axes and a row for every character', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW);
      // Every character gets a row, including Carol[2] who never interacts (so the grid aligns across layers).
      expect(ascii).toMatch(/\[0\]/);
      expect(ascii).toMatch(/\[1\]/);
      expect(ascii).toMatch(/\[2\]/);
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
