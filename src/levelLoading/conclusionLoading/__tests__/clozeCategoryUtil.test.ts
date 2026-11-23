import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultRoom } from '@/game/types/Room';
import { ErrorCollector } from '@/levelLoading/errorCollection';
import { createClozeCategories } from '../clozeCategoryUtil';

describe('clozeCategoryUtil', () => {
  describe('createClozeCategories()', () => {
    it('excludes empty and whitespace-only titles from generated categories', () => {
      const rooms = [
        { ...createDefaultRoom(), title:'' },
        { ...createDefaultRoom(), title:' \t ' },
        { ...createDefaultRoom(), title:'Hall' }
      ];
      const characters = [
        { ...createDefaultCharacter(), title:'', description:'Interactive.' },
        { ...createDefaultCharacter(), title:' \t ', description:'Interactive.' },
        { ...createDefaultCharacter(), title:'Sam', description:'Interactive.' }
      ];
      const items = [
        { ...createDefaultItem(), title:'', description:'Interactive.' },
        { ...createDefaultItem(), title:' \t ', description:'Interactive.' },
        { ...createDefaultItem(), title:'Key', description:'Interactive.' }
      ];
      const errors = new ErrorCollector('', []);
      const categories = createClozeCategories('', rooms, characters, items, errors);

      expect(categories.rooms.allowedValues).toEqual(['Hall']);
      expect(categories.characters.allowedValues).toEqual(['Sam']);
      expect(categories.items.allowedValues).toEqual(['Key']);
      expect(errors.count).toBe(0);
    });

    it('deduplicates normalized room titles with a deterministic sorted representative', () => {
      const rooms = [
        { ...createDefaultRoom(), id:'one', title:'Hall' },
        { ...createDefaultRoom(), id:'two', title:' hall ' },
        { ...createDefaultRoom(), id:'three', title:'Study' }
      ];
      const errors = new ErrorCollector('', []);
      const categories = createClozeCategories('', rooms, [], [], errors);

      expect(categories.rooms.allowedValues).toEqual([' hall ', 'Study']);
      expect(rooms.map(room => room.title)).toEqual(['Hall', ' hall ', 'Study']);
      expect(errors.count).toBe(0);
    });

    it('deduplicates interactive character titles without changing inclusion criteria', () => {
      const characters = [
        { ...createDefaultCharacter(), id:'one', title:'Sam', description:'Interactive.' },
        { ...createDefaultCharacter(), id:'two', title:' sam ', description:'Interactive.' },
        { ...createDefaultCharacter(), id:'three', title:'Pat', description:'Interactive.' },
        { ...createDefaultCharacter(), id:'four', title:'Statue' }
      ];
      const errors = new ErrorCollector('', []);
      const categories = createClozeCategories('', [], characters, [], errors);

      expect(categories.characters.allowedValues).toEqual([' sam ', 'Pat']);
      expect(errors.count).toBe(0);
    });

    it('deduplicates numbered and differently spelled interactive item titles', () => {
      const items = [
        { ...createDefaultItem(), id:'chair', title:'Chair', description:'Interactive.' },
        { ...createDefaultItem(), id:'chair #1', title:'Chair', description:'Interactive.' },
        { ...createDefaultItem(), id:'chair #2', title:'chair', description:'Interactive.' },
        { ...createDefaultItem(), id:'ornament', title:'Ornament' }
      ];
      const errors = new ErrorCollector('', []);
      const categories = createClozeCategories('', [], [], items, errors);

      expect(categories.items.allowedValues).toEqual(['Chair']);
      expect(errors.count).toBe(0);
    });
  });
});