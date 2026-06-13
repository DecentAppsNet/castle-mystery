// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { renderTransferCostTableAscii, transferCostTableToJsonObject } from '../transferCostSerializeUtil';
import TransferCostTable from '../types/TransferCostTable';

const TABLE:TransferCostTable = {
  items:[
    { id:'wineskin', title:'Big Wineskin' },
    { id:'goblet', title:'Goblet' }
  ],
  rows:[
    { characterId:'alice', characterTitle:'Alice', costs:[0, 2] },
    { characterId:'pietro', characterTitle:'Pietro di Ruggero di Palermo', costs:[1, null] }
  ]
};

describe('transferCostSerializeUtil', () => {
  describe('transferCostTableToJsonObject()', () => {
    it('produces the stable automation contract shape, preserving null costs', () => {
      const json = transferCostTableToJsonObject(TABLE, 'lvl.md');
      expect(json.level).toBe('lvl.md');
      expect(json.items).toEqual([{ id:'wineskin', title:'Big Wineskin' }, { id:'goblet', title:'Goblet' }]);
      expect(json.rows).toEqual([
        { characterId:'alice', characterTitle:'Alice', costs:[0, 2] },
        { characterId:'pietro', characterTitle:'Pietro di Ruggero di Palermo', costs:[1, null] }
      ]);
    });

    it('defaults the level name to null', () => {
      expect(transferCostTableToJsonObject(TABLE).level).toBeNull();
    });
  });

  describe('renderTransferCostTableAscii()', () => {
    it('renders full item names, truncated character names, costs, and ∞ for unreachable', () => {
      const ascii = renderTransferCostTableAscii(TABLE, 'lvl.md');
      expect(ascii).toContain('Item access cost — lvl.md');
      expect(ascii).toContain('Big Wineskin'); // Item names shown in full.
      expect(ascii).toContain('Pietro di R…'); // Character names truncated like the cube (12 chars).
      expect(ascii).not.toContain('Pietro di Ruggero di Palermo');
      expect(ascii).toMatch(/Alice\s+0\s+2/); // alice: 0 to wineskin, 2 to goblet.
      expect(ascii).toContain('∞'); // pietro cannot reach the goblet.
    });

    it('notes when there are no characters or items', () => {
      const ascii = renderTransferCostTableAscii({ items:[], rows:[] });
      expect(ascii).toContain('(no characters or items to relate)');
    });
  });
});
