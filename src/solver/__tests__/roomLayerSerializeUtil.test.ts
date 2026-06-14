// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { renderRoomLayerCubeAscii, roomLayerViewToJsonObject } from '../roomLayerSerializeUtil';
import RoomLayerView from '../types/RoomLayerView';

const NINE_OH_FIVE = (9 * 60 + 5) * 60_000;     // 09:05
const THIRTEEN_THIRTY = (13 * 60 + 30) * 60_000; // 13:30
const SEVEN_THIRTY = (7 * 60 + 30) * 60_000;     // 07:30

// Parlor (top) and Cellar (below it) sit in the same grid column; Parlor's matrix is wider, so Cellar
// is padded to match. Cellar is authored title-less to exercise the room-id fallback.
const VIEW:RoomLayerView = {
  characterLabels:['Alice', 'Bob', 'Carol'],
  itemLabels:['Knife', 'Goblet'],
  rooms:[
    { roomId:'parlor', title:'Parlor', gridRow:0, gridCol:0, characterIndices:[0, 1], itemIndices:[0, 1], interactions:[
      { characterIndex:0, itemIndex:0, firstInteractionTime:NINE_OH_FIVE },
      { characterIndex:1, itemIndex:1, firstInteractionTime:THIRTEEN_THIRTY }
    ] },
    { roomId:'cellar', title:'', gridRow:1, gridCol:0, characterIndices:[2], itemIndices:[1], interactions:[
      { characterIndex:2, itemIndex:1, firstInteractionTime:SEVEN_THIRTY }
    ] }
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
        { roomId:'parlor', title:'Parlor', gridRow:0, gridCol:0, characterIndices:[0, 1], itemIndices:[0, 1], interactions:[
          { characterIndex:0, itemIndex:0, firstInteractionTime:NINE_OH_FIVE },
          { characterIndex:1, itemIndex:1, firstInteractionTime:THIRTEEN_THIRTY }
        ] },
        { roomId:'cellar', title:'', gridRow:1, gridCol:0, characterIndices:[2], itemIndices:[1], interactions:[
          { characterIndex:2, itemIndex:1, firstInteractionTime:SEVEN_THIRTY }
        ] }
      ]);
    });

    it('defaults the level name to null', () => {
      expect(roomLayerViewToJsonObject(VIEW).level).toBeNull();
    });
  });

  describe('renderRoomLayerCubeAscii()', () => {
    it('labels rows and columns with character and item names, with each room\'s own times', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW, 'lvl.md');
      expect(ascii).toContain('Room interaction cube — lvl.md');
      expect(ascii).toContain('Each box is a room positioned to match the level map.');
      expect(ascii).toContain('Parlor');
      expect(ascii).toContain('Knife'); // Item names head the columns.
      expect(ascii).toContain('Goblet');
      // Parlor: Alice met Knife at 09:05, Bob met Goblet at 13:30. Cellar: Carol met Goblet at 07:30.
      expect(ascii).toMatch(/Alice +09:05/);
      expect(ascii).toMatch(/Carol +07:30/); // Cellar only shows its own present character/item.
    });

    it('falls back to the room id when a room is title-less', () => {
      expect(renderRoomLayerCubeAscii(VIEW)).toContain('cellar');
    });

    it('truncates long character and item names with no marker', () => {
      const longView:RoomLayerView = {
        characterLabels:['Salomone ben David di Palermo'],
        itemLabels:['A Remarkably Long Item Name'],
        rooms:[{ roomId:'hall', title:'Hall', gridRow:0, gridCol:0, characterIndices:[0], itemIndices:[0], interactions:[{ characterIndex:0, itemIndex:0, firstInteractionTime:0 }] }]
      };
      const ascii = renderRoomLayerCubeAscii(longView);
      expect(ascii).toContain('Salomone ben'); // Hard-truncated to 12 chars, no ellipsis or arrow.
      expect(ascii).toContain('A Remarkably');
      expect(ascii).not.toContain('…');
      expect(ascii).not.toContain('→');
      expect(ascii).not.toContain('Salomone ben David di Palermo'); // The full name is shortened.
      expect(ascii).not.toContain('A Remarkably Long Item Name');
    });

    it('draws each room as an isometric box extruded up and to the left', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW);
      expect(ascii).toContain('\\'); // Up-left isometric edges.
      expect(ascii).not.toContain('/'); // Nothing extends to the right anymore.
      expect(ascii).toMatch(/\+-+\+/); // Box borders.
    });

    it('pads rooms in a column to the widest room so their boxes align', () => {
      const ascii = renderRoomLayerCubeAscii(VIEW);
      // Parlor (2 item columns) and Cellar (1) share grid column 0, so both bottom borders are equally wide.
      const borderWidths = ascii.split('\n').filter(line => /^\s*\+-+\+$/.test(line)).map(line => line.trim().length);
      expect(new Set(borderWidths).size).toBe(1);
      expect(borderWidths.length).toBeGreaterThanOrEqual(2);
    });

    it('handles a view with no rooms', () => {
      const ascii = renderRoomLayerCubeAscii({ characterLabels:[], itemLabels:[], rooms:[] });
      expect(ascii).toContain('(no rooms)');
    });
  });
});
