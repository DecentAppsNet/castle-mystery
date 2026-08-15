import { describe, expect, it } from 'vitest';

import levelTimesBaseText from './fixtures/level-times-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

describe('level loading - times and labels', () => {
  it('sets start time from first event of itinerary section when itinerary available', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', ['1:02:03 Sam waits']);
    const { level, errors } = loadLevelForTest(text, 'times-inferred-start.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(3_723_000);
  });

  it('ignores leading and interstitial blank itinerary lines', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', [
      '', '', '0:00:03 Sam sits', '', ': Sam stands'
    ]);
    const { level, errors } = loadLevelForTest(text, 'times-blank-lines.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(3_000);
    expect(level?.endTime).toBe(3_000);
  });

  it('reports an invalid first timestamp at the first activity line', () => {
    const activityText = ': Sam stands';
    const text = replaceSection(levelTimesBaseText, 'itinerary', ['', '', activityText]);
    const activityLineNo = text.split('\n').findIndex(line => line === activityText) + 1;

    const { level, errors } = loadLevelForTest(text, 'times-relative-first.md');

    expect(level).toBeNull();
    expect(errors.describeErrors()).toBe(
      `times-relative-first.md:${activityLineNo}:0: First line in itinerary began with ":". Expecting an absolute timestamp.`
    );
  });

  it('reports an invalid activity at its exact line', () => {
    const activityText = '0:00:04 Sam dances';
    const text = replaceSection(levelTimesBaseText, 'itinerary', [
      '0:00:03 Sam sits',
      '',
      activityText
    ]);
    const activityLineNo = text.split('\n').findIndex(line => line === activityText) + 1;

    const { level, errors } = loadLevelForTest(text, 'times-invalid-activity.md');

    expect(level).toBeNull();
    expect(errors.describeErrors().startsWith(`times-invalid-activity.md:${activityLineNo}:0:`)).toBe(true);
  });

  it('sets start time to 0 when itinerary is unavailable', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', []);
    const { level, errors } = loadLevelForTest(text, 'times-default-start.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.startTime).toBe(0);
  });

  it('sets initial time to authored value when available', () => {
    let text = replaceSection(levelTimesBaseText, 'general', ['* activeCharacter=Sam', '* time=0:00:02']);
    text = replaceSection(text, 'itinerary', ['0:00:01 sam sits', '0:00:03 sam stands']);
    const { level, errors } = loadLevelForTest(text, 'times-authored-initial.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.initialTime).toBe(2_000);
  });

  it('clamps authored initial time to start time if earlier', () => {
     let text = replaceSection(levelTimesBaseText, 'general', ['* activeCharacter=Sam', '* time=0:00:00']);
    text = replaceSection(text, 'itinerary', ['0:00:01 sam sits', '0:00:03 sam stands']);
    const { level, errors } = loadLevelForTest(text, 'times-authored-initial.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.initialTime).toBe(1_000);
  });

  it('clamps authored initial time to end time if later', () => {
     let text = replaceSection(levelTimesBaseText, 'general', ['* activeCharacter=Sam', '* time=5:00:00']);
    text = replaceSection(text, 'itinerary', ['0:00:01 sam sits', '0:00:03 sam stands']);
    const { level, errors } = loadLevelForTest(text, 'times-authored-initial.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.initialTime).toBe(3_000);
  });

  it('sets initial time to start time when authored value unavailable', () => {
    const text = replaceSection(levelTimesBaseText, 'general', ['* activeCharacter=Sam']);
    const { level, errors } = loadLevelForTest(text, 'times-default-initial.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.initialTime).toBe(3_000);
  });

  it('sets end time based on latest activity in itinerary when itinerary available', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', ['0:00:00 Sam @ Hall', '1:00:00 Sam @ Closet', '2:00:00 Sam @ Hall']);
    const { level, errors } = loadLevelForTest(text, 'times-inferred-end.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.endTime).toBe(7_200_000);
  });

  it('sets end time to start time when itinerary is unavailable', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', []);
    const { level, errors } = loadLevelForTest(text, 'times-default-end.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.endTime).toBe(0);
  });

  it('sets time labels when start time is equal to end time', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', []);
    const { level, errors } = loadLevelForTest(text, 'time-labels-equal.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.labels).toEqual([
      { minutes:0, label:'midnight' }, { minutes:0, label:'midnight' }
    ]);
  });

  it('sets time labels when start and end times are seconds apart', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', ['1:00:00 sam sits', '1:00:04 sam stands']);
    const { level, errors } = loadLevelForTest(text, 'time-labels-seconds.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.labels).toEqual([
      { minutes:60, label:'1am' }, { minutes:60 + 4 / 60, label:'1am' }
    ]);
  });

  it('sets time labels when start and end times are minutes apart', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', ['1:00:00 Sam sits', '2:00:00 Sam stands']);
    const { level, errors } = loadLevelForTest(text, 'time-labels-minutes.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.labels).toEqual([
      { minutes:60, label:'1am' }, { minutes:75, label:'1:15am' }, { minutes:90, label:'1:30am' },
      { minutes:105, label:'1:45am' }, { minutes:120, label:'2am' }
    ]);
  });

  it('sets time labels when start and end times cross midnight', () => {
    const text = replaceSection(levelTimesBaseText, 'itinerary', [
      '23:00:00 Sam sits', '25:00:00 Sam stands'
    ]);
    const { level, errors } = loadLevelForTest(text, 'time-labels-cross-midnight.md');

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    expect(level?.labels).toEqual([
      { minutes:1380, label:'11pm' }, { minutes:1410, label:'11:30pm' }, { minutes:1440, label:'midnight' },
      { minutes:1470, label:'12:30am' }, { minutes:1500, label:'1am' }
    ]);
  });
});