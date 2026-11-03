import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLevelFromUrl } from '..';
import { createKeyframeAtTime } from '@/game/timeline';
import sourceText from './fixtures/items/items-numbered-import.md?raw';
import definitionsText from './fixtures/items/items-numbered-definitions.md?raw';

describe('level loading - imported numbered items', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves imported bases and exact definitions before numbered generation in every loading path', async () => {
    vi.stubGlobal('window', { location:{ pathname:'/' } });
    vi.stubGlobal('fetch', vi.fn(async (url:string) => {
      if (url.endsWith('/levels/items-numbered-import.md')) return { ok:true, text:async () => sourceText };
      if (url.endsWith('/levels/items-numbered-definitions.md')) return { ok:true, text:async () => definitionsText };
      throw new Error(`Unexpected URL ${url}`);
    }));
    const { level, errors } = await loadLevelFromUrl('items-numbered-import.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level!.itemsById.get('chair #1')).toMatchObject({
      title:'Imported Seat', description:'Imported base chair.', imageUrl:'/assets/items/chair.png'
    });
    expect(level!.itemsById.get('chair #2')).toMatchObject({
      title:'Imported Throne', description:'Imported explicit chair.', imageUrl:null
    });
    expect(level!.itemsById.get('chair #3')).toMatchObject({
      title:'Chair #3', description:'Local explicit chair.', imageUrl:null
    });
    expect(level!.characters[0].items[0]).toMatchObject({ id:'token #1', title:'Imported Token' });
    expect(level!.characters[0].leftHandItem).toMatchObject({ id:'token #2', title:'Imported Token' });
    expect(level!.itemsById.get('token #4')?.title).toBe('Imported Token');
    expect(createKeyframeAtTime(level!.timeline.keyframes, 0).characters[0].leftHandItem?.id).toBe('token #4');
    expect(level!.itemsById.has('chair')).toBe(false);
    expect(level!.itemsById.has('token')).toBe(false);
  });
});