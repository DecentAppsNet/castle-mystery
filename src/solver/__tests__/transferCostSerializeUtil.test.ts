// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { renderTransferCostTableAscii, transferCostTableToJsonObject } from '../transferCostSerializeUtil';
import TransferCostTable from '../types/TransferCostTable';

const T_0730 = 27_000_000; // 07:30 in msecs.
const T_0731 = 27_060_000; // 07:31 in msecs.

const TABLE:TransferCostTable = {
  items:[
    { id:'wineskin', title:'Big Wineskin' },
    { id:'goblet', title:'Goblet' }
  ],
  rows:[
    { characterId:'alice', characterTitle:'Alice', cells:[
      { cost:0, switches:[] }, // Already witnesses the wineskin.
      { cost:2, switches:[
        { characterId:'bob', characterTitle:'Bob', time:T_0730 },
        { characterId:'carol', characterTitle:'Carol', time:T_0731 }
      ] }
    ] },
    { characterId:'pietro', characterTitle:'Pietro di Ruggero di Palermo', cells:[
      { cost:1, switches:[{ characterId:'giorgios', characterTitle:'Giorgios tou Nikolaou', time:T_0730 }] },
      { cost:null, switches:[] } // Cannot reach the goblet.
    ] }
  ]
};

describe('transferCostSerializeUtil', () => {
  describe('transferCostTableToJsonObject()', () => {
    it('produces the stable automation contract shape, preserving null costs and full switch chains', () => {
      const json = transferCostTableToJsonObject(TABLE, 'lvl.md');
      expect(json.level).toBe('lvl.md');
      expect(json.items).toEqual([{ id:'wineskin', title:'Big Wineskin' }, { id:'goblet', title:'Goblet' }]);
      expect(json.rows).toEqual([
        { characterId:'alice', characterTitle:'Alice', cells:[
          { cost:0, switches:[] },
          { cost:2, switches:[
            { characterId:'bob', characterTitle:'Bob', time:T_0730 },
            { characterId:'carol', characterTitle:'Carol', time:T_0731 }
          ] }
        ] },
        { characterId:'pietro', characterTitle:'Pietro di Ruggero di Palermo', cells:[
          { cost:1, switches:[{ characterId:'giorgios', characterTitle:'Giorgios tou Nikolaou', time:T_0730 }] },
          { cost:null, switches:[] }
        ] }
      ]);
    });

    it('defaults the level name to null', () => {
      expect(transferCostTableToJsonObject(TABLE).level).toBeNull();
    });
  });

  describe('renderTransferCostTableAscii()', () => {
    it('draws a bordered grid with → between each (truncated) switch character and its time', () => {
      const ascii = renderTransferCostTableAscii(TABLE, 'lvl.md');
      expect(ascii).toContain('Item access cost — lvl.md');
      expect(ascii).toMatch(/\+-{3,}\+/);        // Bordered table guidelines.
      expect(ascii).toContain('| Big Wineskin'); // Item names shown in full, inside the border.
      expect(ascii).toContain('Bob → 07:30');    // alice -> goblet: first switch, → between name and time.
      expect(ascii).toContain('Carol → 07:31');  // alice -> goblet: second switch (later time).
      expect(ascii).toContain('Giorgios tou → 07:30'); // Name hard-truncated to 12 (no marker), then → time.
      expect(ascii).toContain('Pietro di Ru');   // Row character names truncated with no extra characters.
      expect(ascii).not.toContain('Pietro di Ruggero di Palermo');
      expect(ascii).not.toContain('…');          // No ellipsis anywhere.
      expect(ascii).toContain('—'); // alice already witnesses the wineskin (0 switches).
      expect(ascii).toContain('∞'); // pietro cannot reach the goblet.
    });

    it('notes when there are no characters or items', () => {
      const ascii = renderTransferCostTableAscii({ items:[], rows:[] });
      expect(ascii).toContain('(no characters or items to relate)');
    });
  });
});
