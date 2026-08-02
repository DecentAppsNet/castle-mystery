import { describe, it, expect } from 'vitest';
import ErrorCollector from '../errorCollection/ErrorCollector';
import SourceLineMap from '../importing/types/SourceLineMap';
import { loadLevelFromText } from '../loadLevelUtil';
import duplicateHeadingText from './fixtures/items-duplicate-heading.md?raw';
import invalidDrawOffsetXText from './fixtures/items-invalid-draw-offset-x.md?raw';
import invalidDrawOffsetYText from './fixtures/items-invalid-draw-offset-y.md?raw';
import invalidDrawOffsetZText from './fixtures/items-invalid-draw-offset-z.md?raw';
import invalidStackOffsetXText from './fixtures/items-invalid-stack-offset-x.md?raw';
import invalidStackOffsetYText from './fixtures/items-invalid-stack-offset-y.md?raw';
import invalidStackOffsetZText from './fixtures/items-invalid-stack-offset-z.md?raw';
import invalidVisibleText from './fixtures/items-invalid-visible.md?raw';
import normalizationDuplicateText from './fixtures/items-normalization-duplicate.md?raw';
import successMinimalText from './fixtures/items-success-minimal.md?raw';
import successPopulatedText from './fixtures/items-success-populated.md?raw';

function _createSourceLineMap(text:string, filename:string):SourceLineMap {
  return text.split('\n').map((_, index) => ({ filename, lineNo:index + 1 }));
}

function _loadLevel(text:string, filename:string) {
  const errors = new ErrorCollector(text, _createSourceLineMap(text, filename));
  const level = loadLevelFromText(text, errors);
  return { level, errors };
}

describe('loading levels - items', () => {
  it('loads a level with no items section entries and leaves item collections empty on the returned level', () => {
    const { level, errors } = _loadLevel(successMinimalText, 'items-success-minimal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.itemsById.size).toBe(0);
    expect(level?.rooms).toHaveLength(1);
    expect(level?.rooms[0]?.items).toEqual([]);
  });

  it('loads item metadata into room items found on the returned level', () => {
    const { level, errors } = _loadLevel(successPopulatedText, 'items-success-populated.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.itemsById.size).toBe(0);
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

  it('fails if the items section contains duplicate subsections with the same heading text', () => {
    const { level, errors } = _loadLevel(duplicateHeadingText, 'items-duplicate-heading.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain("duplicate section 'Brass Key'");
  });

  it('fails if the items section contains different headings that normalize to the same item ID', () => {
    const { level, errors } = _loadLevel(normalizationDuplicateText, 'items-normalization-duplicate.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('After normalization');
  });

  it('fails if an item visible value is not boolean-like', () => {
    const { level, errors } = _loadLevel(invalidVisibleText, 'items-invalid-visible.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "maybe" to be "true" or "false"');
  });

  it('fails if drawOffsetX is not numeric', () => {
    const { level, errors } = _loadLevel(invalidDrawOffsetXText, 'items-invalid-draw-offset-x.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if drawOffsetY is not numeric', () => {
    const { level, errors } = _loadLevel(invalidDrawOffsetYText, 'items-invalid-draw-offset-y.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if drawOffsetZ is not numeric', () => {
    const { level, errors } = _loadLevel(invalidDrawOffsetZText, 'items-invalid-draw-offset-z.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetX is not numeric', () => {
    const { level, errors } = _loadLevel(invalidStackOffsetXText, 'items-invalid-stack-offset-x.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetY is not numeric', () => {
    const { level, errors } = _loadLevel(invalidStackOffsetYText, 'items-invalid-stack-offset-y.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });

  it('fails if stackOffsetZ is not numeric', () => {
    const { level, errors } = _loadLevel(invalidStackOffsetZText, 'items-invalid-stack-offset-z.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected "nope" to be a numberValue.');
  });
});
