import { describe, it, expect } from 'vitest';
import defaultLevelText from './fixtures/items-base.md?raw';
import itemPlacementText from './fixtures/items-placement.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('loading levels - items', () => {
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
      position:{ x:0, y:20, z:0 },
      drawOffset:{ x:1.5, y:2, z:3 },
      stackOffset:{ x:4, y:5.25, z:6 },
      isDiscovered:false,
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
    const text = replaceSection(itemPlacementText, 'itinerary', ['0:00:00 Key becomes Pencil']);
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
