// Follow test conventions from CONTRIBUTING.md when editing this file.

import { describe, expect, it } from 'vitest';

import activityConflictBaseText from './fixtures/activity-conflict-base.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _loadActivities(itineraryLines:readonly string[], filename:string = 'activity-conflict.md') {
  const text = replaceSection(activityConflictBaseText, 'itinerary', itineraryLines);
  return { ...loadLevelForTest(text, filename), text };
}

describe('character activity conflict integration', () => {
  it('rejects overlapping non-item activities for one character at the current source line', () => {
    const currentActivity = '0:00:01 Sam says "This sentence lasts several seconds."';
    const { level, errors, text } = _loadActivities([
      '0:00:00 Sam waits 3',
      currentActivity
    ], 'overlapping-activities.md');
    const currentLineNo = text.split('\n').findIndex(line => line === currentActivity) + 1;

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain(`overlapping-activities.md:${currentLineNo}:0:`);
    expect(errors.describeErrors()).toContain('"sam" character can\'t "says" because they are busy with "waits" activity starting at 0:00:00.');
  });

  it('rejects waiting during relative movement', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam stands',
      ': Sam @ Closet',
      '0:00:00 Sam waits 3'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "waits" because they are busy with "@" activity');
  });

  it('allows concurrent nonzero activities by different characters', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam waits 2',
      '0:00:00 Jo waits 2'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows one activity to start at the exact end of another', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam waits 2',
      '0:00:02 Sam waits 1'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows multiple zero-duration activities at one timestamp', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam sits',
      '0:00:00 Sam faces Jo',
      '0:00:00 Sam stands'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows a zero-duration state change during a longer activity', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam waits 3',
      '0:00:01 Sam sits'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('does not make a says listener busy', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds." to Jo',
      '0:00:01 Jo waits 2'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('rejects overlapping says activities by the same character', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds."',
      '0:00:01 Sam says "So does this sentence."'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "says" because they are busy with "says" activity');
  });

  it('rejects overlapping thinks activities by the same character', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam thinks "This thought lasts several seconds."',
      '0:00:01 Sam thinks "So does this thought."'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "thinks" because they are busy with "thinks" activity');
  });

  it('makes a character-source emits activity busy', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam emits "A bell rings for several seconds."',
      '0:00:01 Sam waits 2'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"sam" character can\'t "waits" because they are busy with "emits" activity');
  });

  it('allows another character to think during speech', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds."',
      '0:00:01 Jo thinks "A simultaneous thought."'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows another character to emit during speech', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds."',
      '0:00:01 Jo emits "A simultaneous noise."'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('still rejects incompatible speech by another audible character', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds."',
      '0:00:01 Jo says "Overlapping audible speech."'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Character can\'t start speaking');
  });

  it('preserves zero-duration interrupts behavior during speech', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam says "This sentence lasts several seconds."',
      '0:00:01 Jo interrupts "Excuse me."'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('does not make a drop location target busy', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam drops Coin at Jo',
      '0:00:00 Jo waits 2'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('makes both give participants busy for the complete activity', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Sam gives Coin to Jo',
      '0:00:00 Jo waits 2'
    ]);

    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('"jo" character can\'t "waits" because they are busy with "gives" activity');
  });

  it('does not make a character busy for item-only activities', () => {
    const { level, errors } = _loadActivities([
      '0:00:00 Coin emits "A bell rings for several seconds."',
      '0:00:00 Coin becomes Ring',
      '0:00:00 hide Coin',
      '0:00:00 show Coin',
      '0:00:00 Sam waits 2'
    ]);

    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });
});
