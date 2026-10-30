import { describe, expect, it } from 'vitest';
import demoText from './fixtures/points-demo.md?raw';
import { loadValidLevelForTest } from './testLevelUtil';

describe('pointing author demo', () => {
  it('loads the full pose/facing/direction matrix and target examples', () => {
    const level = loadValidLevelForTest(demoText);
    const samI = level.timeline.characterIdToI.sam;
    const points = new Set(level.timeline.keyframes.flatMap(frame =>
      frame.characters[samI].effects.filter(effect => effect.kind === 'point')));
    expect(points.size).toBe(69);
  });
});