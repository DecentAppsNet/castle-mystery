import { describe, it, expect } from 'vitest';
import defaultLevelText from './fixtures/items/items-base.md?raw';
import itemPlacementText from './fixtures/items/items-placement.md?raw';
import numberedItemsText from './fixtures/items/items-numbered.md?raw';
import explicitNumberedItemsText from './fixtures/items/items-numbered-explicit.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';
import { resolveItemDefinition } from '../itemLoading';
import { createDefaultPosition } from '@/game/types/Position';

describe('loading levels - items', () => {
  describe('numbered room items', () => {
    it('places distinct numbered items in different rooms', () => {
      const level = loadValidLevelForTest(numberedItemsText);
      const hallChair = level.itemsById.get('chair #1');
      const closetChair = level.itemsById.get('chair #2');

      expect(hallChair).toBeDefined();
      expect(closetChair).toBeDefined();
      expect(level.rooms.find(room => room.id === 'hall')?.items).toContain(hallChair);
      expect(level.rooms.find(room => room.id === 'closet')?.items).toContain(closetChair);
      expect(hallChair).not.toBe(closetChair);
      expect(hallChair?.position).not.toEqual(closetChair?.position);
    });

    it('keeps independently placed base and numbered items separate', () => {
      const level = loadValidLevelForTest(numberedItemsText);
      const base = level.itemsById.get('chair');
      const numbered = level.itemsById.get('chair #1');

      expect(base).toBeDefined();
      expect(numbered).toBeDefined();
      expect(numbered).not.toBe(base);
      expect(numbered?.position).not.toBe(base?.position);
      expect(numbered?.position).not.toEqual(base?.position);
    });

    it('preserves stack order and distinct identities within one room', () => {
      const level = loadValidLevelForTest(numberedItemsText);
      const items = level.rooms.find(room => room.id === 'closet')!.items;

      expect(items.map(item => item.id)).toEqual(['chair #2', 'chair #20', 'chair #01', 'chair #0']);
      expect(new Set(items).size).toBe(4);
      expect(items[1].position).toEqual(items[2].position);
      expect(items[1].position).not.toBe(items[2].position);
      expect(level.itemsById.has('chair #19')).toBe(false);
    });

    it('inherits authored properties and the unsuffixed default title', () => {
      const level = loadValidLevelForTest(numberedItemsText);

      expect(level.itemsById.get('chair #1')).toMatchObject({
        title:'Chair', description:'A sturdy wooden chair.', imageUrl:'/assets/items/chair.png',
        isVisible:false, drawOffset:{ x:1, y:2, z:3 }, stackOffset:{ x:4, y:5, z:6 }
      });
    });

    it('inherits a custom resolved title', () => {
      const level = loadValidLevelForTest(explicitNumberedItemsText);

      expect(level.itemsById.get('chair #4')?.title).toBe('Wooden Seat');
      expect(level.itemsById.has('chair')).toBe(false);
    });

    it('uses explicit numbered definitions as complete replacements', () => {
      const level = loadValidLevelForTest(explicitNumberedItemsText);

      expect(level.itemsById.get('chair #2')).toMatchObject({
        title:'Chair #2', description:'Explicit replacement.', isVisible:true, imageUrl:null
      });
    });

    it('accepts exact authored IDs outside the generation grammar', () => {
      const level = loadValidLevelForTest(explicitNumberedItemsText);

      expect(level.itemsById.get('chair#3')?.title).toBe('Chair#3');
      expect(level.itemsById.get('chair #2 #3')?.title).toBe('Chair #2 #3');
    });

    it('registers repeated resolution once with fresh, unplaced state', () => {
      const level = loadValidLevelForTest(numberedItemsText);
      const items = [...level.itemsById.values()];
      const base = items.find(item => item.id === 'chair');
      const item = resolveItemDefinition(items, 'chair #7');

      expect(item).not.toBeNull();
      expect(item?.position).toEqual(createDefaultPosition());
      expect(item?.position).not.toBe(base?.position);
      expect(resolveItemDefinition(items, 'chair #7')).toBe(item);
      expect(items.filter(candidate => candidate.id === 'chair #7')).toHaveLength(1);
    });

    it('keeps zero-padded and ordinary suffixes as different IDs', () => {
      const level = loadValidLevelForTest(numberedItemsText);

      expect(level.itemsById.get('chair #01')).toBeDefined();
      expect(level.itemsById.get('chair #1')).toBeDefined();
      expect(level.itemsById.get('chair #01')).not.toBe(level.itemsById.get('chair #1'));
    });

    it('does not leak generated objects between level loads', () => {
      const first = loadValidLevelForTest(numberedItemsText);
      const second = loadValidLevelForTest(numberedItemsText);

      expect(first.itemsById.get('chair #1')).not.toBe(second.itemsById.get('chair #1'));
      expect(first.itemsById.get('chair #1')?.position).not.toBe(second.itemsById.get('chair #1')?.position);
    });

    it('reports unknown numbered bases through the room error path', () => {
      const text = numberedItemsText.replace('* A=Chair #1', '* A=Table #1');
      const { level, errors } = loadLevelForTest(text, 'unknown-numbered-base.md');

      expect(level).toBeNull();
      expect(errors.describeErrors()).toContain('"table #1" referenced in legend for "hall"');
      expect(errors.describeErrors()).toContain('unknown-numbered-base.md');
    });

    it('rejects malformed automatic references', () => {
      const text = numberedItemsText.replace('* A=Chair #1', '* A=Chair#1');
      const { level, errors } = loadLevelForTest(text);

      expect(level).toBeNull();
      expect(errors.describeErrors()).toContain('"chair#1" referenced in legend');
    });

    it('does not generate from an already generated numbered base', () => {
      const text = numberedItemsText.replace('* C=Chair #2', '* C=Chair #1 #3');
      const { level, errors } = loadLevelForTest(text);

      expect(level).toBeNull();
      expect(errors.describeErrors()).toContain('"chair #1 #3" referenced in legend');
    });

    it('does not generate from an explicitly numbered base', () => {
      const text = explicitNumberedItemsText.replace('* D=Chair #4', '* D=Chair #2 #4');
      const { level, errors } = loadLevelForTest(text);

      expect(level).toBeNull();
      expect(errors.describeErrors()).toContain('"chair #2 #4" referenced in legend');
    });

    it('does not generate items for known character-only legend references', () => {
      const text = numberedItemsText.replace('activeCharacter=Sam', 'activeCharacter=Chair #7')
        .replace('* S=Sam', '* S=Chair #7').replace('## Sam', '## Chair #7');
      const level = loadValidLevelForTest(text);

      expect(level.characters[0].id).toBe('chair #7');
      expect(level.itemsById.has('chair #7')).toBe(false);
      expect(level.rooms.flatMap(room => room.items).some(item => item.id === 'chair #7')).toBe(false);
    });
  });

  it('loads a level with no items section entries and leaves item collections empty on the returned level', () => {
    const { level, errors } = loadLevelForTest(defaultLevelText, 'items-success-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.itemsById.size).toBe(0);
    expect(level?.rooms).toHaveLength(1);
    expect(level?.rooms[0]?.items).toEqual([]);
  });

  it('loads item metadata into room items found on the returned level', () => {
    let text = replaceSection(defaultLevelText, 'rooms', [
      '## Hall',
      '',
      '```',
      'K...',
      '..S.',
      '....',
      '```',
      '',
      '* K=Brass Key',
      '* S=Sam'
    ]);
    text = replaceSection(text, 'items', [
      '## Brass Key',
      '* title=Master Key',
      '* description=Opens the tower lock.',
      '* image=brass-key.png',
      '* visible=false',
      '* drawOffsetX=1.5',
      '* drawOffsetY=2',
      '* drawOffsetZ=3',
      '* stackOffsetX=4',
      '* stackOffsetY=5.25',
      '* stackOffsetZ=6'
    ]);
    const { level, errors } = loadLevelForTest(text, 'items-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.itemsById.size).toBe(1);
    expect(level?.rooms).toHaveLength(1);
    expect(level?.rooms[0]?.items).toHaveLength(1);
    expect(level?.rooms[0]?.items[0]).toEqual({
      id:'brass key',
      title:'Master Key',
      description:'Opens the tower lock.',
      imageUrl:'/assets/items/brass-key.png',
      isVisible:false,
      position:{ x:2.5, y:19.999, z:0.1667 },
      drawOffset:{ x:1.5, y:2, z:3 },
      stackOffset:{ x:4, y:5.25, z:6 },
      randomSalt:expect.any(Number)
    });
  });

  it('indexes room and hand items but excludes an inventory-only item', () => {
    const { level, errors } = loadLevelForTest(itemPlacementText, 'items-placement.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect([...level!.itemsById.keys()]).toEqual(['key', 'vase', 'eraser', 'paper']);
  });

  it('indexes an inventory item referenced by activity itemId', () => {
    const text = replaceSection(itemPlacementText, 'itinerary', ['0:00:00 Sam takes Pencil into inventory']);
    const { level, errors } = loadLevelForTest(text, 'items-activity-item.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.itemsById.has('pencil')).toBe(true);
  });

  it('indexes an inventory item referenced by activity toItemId', () => {
    const text = replaceSection(itemPlacementText, 'itinerary', ['0:00:00 pencil becomes broken pencil']);
    const { level, errors } = loadLevelForTest(text, 'items-activity-to-item.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.itemsById.has('pencil')).toBe(true);
  });

  it('fails if the items section contains duplicate subsections with the same heading text', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '', '## Brass Key']);
    const { level, errors } = loadLevelForTest(text, 'items-duplicate-heading.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Brass Key'");
  });

  it('fails if the items section contains different headings that normalize to the same item ID', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '', '## brass key']);
    const { level, errors } = loadLevelForTest(text, 'items-normalization-duplicate.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('After normalization');
  });

  it('fails if an item visible value is not boolean-like', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* visible=maybe']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-visible.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if drawOffsetX is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* drawOffsetX=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-draw-offset-x.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if drawOffsetY is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* drawOffsetY=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-draw-offset-y.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if drawOffsetZ is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* drawOffsetZ=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-draw-offset-z.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetX is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* stackOffsetX=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-stack-offset-x.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetY is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* stackOffsetY=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-stack-offset-y.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetZ is not numeric', () => {
    const text = replaceSection(defaultLevelText, 'items', ['## Brass Key', '* stackOffsetZ=nope']);
    const { level, errors } = loadLevelForTest(text, 'items-invalid-stack-offset-z.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });
});
