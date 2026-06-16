// Follow test conventions from CONTRIBUTING.md when editing this file.
import { describe, expect, it } from 'vitest';

import { anachronismsToJsonObject, renderAnachronismsAscii } from '../anachronismSerializeUtil';
import TimelineAnachronism from '../types/TimelineAnachronism';

function _anachronism():TimelineAnachronism {
  return {
    characterId:'the steward',
    characterTitle:'The Real Thief',
    occupying:{ type:'Speech', startTime:50_578_650, endTime:50_580_000 },
    conflicting:{ type:'Walk', startTime:50_579_000, endTime:50_580_500 },
    overlapMsecs:1_000
  };
}

describe('anachronismSerializeUtil', () => {
  describe('anachronismsToJsonObject()', () => {
    it('flattens each anachronism and reports ok=true when empty', () => {
      expect(anachronismsToJsonObject([], 'level.md')).toEqual({ level:'level.md', anachronisms:[], ok:true });
    });

    it('maps the occupying/conflicting spans and reports ok=false when present', () => {
      const json = anachronismsToJsonObject([_anachronism()], 'level.md');
      expect(json.ok).toBe(false);
      expect(json.anachronisms).toEqual([{
        characterId:'the steward',
        characterTitle:'The Real Thief',
        occupyingType:'Speech',
        occupyingStartTime:50_578_650,
        occupyingEndTime:50_580_000,
        conflictingType:'Walk',
        conflictingStartTime:50_579_000,
        conflictingEndTime:50_580_500,
        overlapMsecs:1_000
      }]);
    });
  });

  describe('renderAnachronismsAscii()', () => {
    it('renders PASS with no findings when there are none', () => {
      const ascii = renderAnachronismsAscii([], 'level.md');
      expect(ascii).toContain('Timeline anachronisms — level.md');
      expect(ascii).toContain('none found');
      expect(ascii).toContain('RESULT: PASS');
      expect(ascii).not.toContain('RESULT: FAIL');
    });

    it('renders FAIL with a line per anachronism showing the character, types and overlap', () => {
      const ascii = renderAnachronismsAscii([_anachronism()], 'level.md');
      expect(ascii).toContain('RESULT: FAIL');
      expect(ascii).toContain('The Real Thief');
      expect(ascii).toContain('Walk (14:02:59');
      expect(ascii).toContain('starts inside Speech (14:02:58');
      expect(ascii).toContain('overlap 1.00s');
    });
  });
});
