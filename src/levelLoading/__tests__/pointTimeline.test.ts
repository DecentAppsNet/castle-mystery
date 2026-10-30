import { describe, expect, it } from 'vitest';
import { assertNonNullable } from 'decent-portal';
import { createPointEffect, getPointDuration } from '@/game/effects/pointEffectUtil';
import Effect from '@/game/effects/types/Effect';
import PointStartSnapshot from '@/game/effects/types/PointStartSnapshot';
import { createKeyframeAtTime } from '@/game/timeline';
import Level from '@/game/types/Level';
import sameTimeText from './fixtures/points-same-time.md?raw';
import movingText from './fixtures/points-moving-target.md?raw';
import ownershipText from './fixtures/points-ownership-boundary.md?raw';
import transferText from './fixtures/points-item-transfer.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';

function _pointAt(level:Level, time:number):Effect {
  const frame = createKeyframeAtTime(level.timeline.keyframes, time);
  const effect = frame.characters[level.timeline.characterIdToI.sam].effects.find(candidate => candidate.kind === 'point');
  assertNonNullable(effect);
  return effect;
}

function _sample(effect:Effect, time:number) {
  assertNonNullable(effect.handler);
  return effect.handler({ stage:'beforeCharacter', characterContext:{} as never },
    {} as never, time, 0, {} as never);
}

function _expectedPoint(level:Level, time:number, target:PointStartSnapshot['target'] = { kind:'character', characterId:'jo' },
    movingCharacterIds:ReadonlySet<string> = new Set()):Effect {
  const frame = createKeyframeAtTime(level.timeline.keyframes, time);
  const characters = level.characters.map(character =>
    ({ ...character, ...frame.characters[level.timeline.characterIdToI[character.id]] }));
  const subject = characters.find(character => character.id === 'sam');
  assertNonNullable(subject);
  const room = { ...level.rooms[0], ...frame.rooms[level.timeline.roomIdToI[level.rooms[0].id]] };
  const effect = createPointEffect(time, { subject, room, characters, movingCharacterIds, target }, 'slowly');
  assertNonNullable(effect);
  return effect;
}

describe('pointing timeline integration', () => {
  it('captures held-item ownership at start rather than its later inventory location', () => {
    const level = loadValidLevelForTest(transferText);
    const stationary = loadValidLevelForTest(transferText.replace('Jo gives Paper to Pat', 'Jo waits'));
    const point = _pointAt(level, 0);
    const expected = _expectedPoint(level, 0, { kind:'heldItem', holderId:'jo' });
    expect(_sample(point, 1000)).toEqual(_sample(expected, 1000));
    expect(_sample(point, 1700)).toEqual(_sample(_pointAt(stationary, 0), 1700));
    const end = createKeyframeAtTime(level.timeline.keyframes, point.endTime);
    expect(end.characters[level.timeline.characterIdToI.pat].items.map(item => item.id)).toContain('paper');
  });

  it('samples interpolated movement authored after pointing rather than initial target state', () => {
    const level = loadValidLevelForTest(movingText);
    const point = _pointAt(level, 1000);
    const joI = level.timeline.characterIdToI.jo;
    const start = createKeyframeAtTime(level.timeline.keyframes, point.startTime).characters[joI];
    const end = createKeyframeAtTime(level.timeline.keyframes, level.timeline.endTime).characters[joI];
    expect(start.position).not.toEqual(level.characters[joI].position);
    expect(start.position).not.toEqual(end.position);
    const sampleTime = point.startTime + (point.endTime - point.startTime) / 2;
    expect(_sample(point, sampleTime)).toEqual(
      _sample(_expectedPoint(level, point.startTime, undefined, new Set(['jo'])), sampleTime));

    const stationary = loadValidLevelForTest(movingText.replace('0:00:00 Jo goes (30%)', '0:00:00 Jo waits'));
    expect(_sample(point, sampleTime)).not.toEqual(_sample(_pointAt(stationary, 1000), sampleTime));
  });

  it('captures identical state regardless of where an earlier target movement is authored', () => {
    const laterAuthored = loadValidLevelForTest(movingText);
    const earlierAuthored = loadValidLevelForTest(movingText.replace(
      '0:00:01 Sam points Jo slowly\n0:00:00 Jo goes (30%)',
      '0:00:00 Jo goes (30%)\n0:00:01 Sam points Jo slowly'));
    expect(_sample(_pointAt(laterAuthored, 1000), 2000))
      .toEqual(_sample(_pointAt(earlierAuthored, 1000), 2000));
  });

  it('does not track a target that begins moving after pointing starts', () => {
    const text = movingText.replace('0:00:01 Sam points', '0:00:00 Sam points')
      .replace('0:00:00 Jo goes', '0:00:01 Jo goes');
    const level = loadValidLevelForTest(text);
    const stationary = loadValidLevelForTest(text.replace('0:00:01 Jo goes (30%)', '0:00:01 Jo waits'));
    const point = _pointAt(level, 0);
    const expected = _pointAt(stationary, 0);
    const first = _sample(point, 1500);
    expect(first).toEqual(_sample(expected, 1500));
    _sample(point, 1900);
    _sample(point, 100);
    expect(_sample(point, 1500)).toEqual(first);
    const joI = level.timeline.characterIdToI.jo;
    expect(createKeyframeAtTime(level.timeline.keyframes, 1500).characters[joI].position)
      .not.toEqual(level.characters[joI].position);
  });

  it('uses the last same-time target edit under existing file order', () => {
    const sitsLast = loadValidLevelForTest(sameTimeText.replace('0:00:00 Jo sits',
      '0:00:00 Jo stands\n0:00:00 Jo sits'));
    const standsLast = loadValidLevelForTest(sameTimeText.replace('0:00:00 Jo sits',
      '0:00:00 Jo sits\n0:00:00 Jo stands'));
    expect(_sample(_pointAt(sitsLast, 0), 1000)).toEqual(_sample(_expectedPoint(sitsLast, 0), 1000));
    expect(_sample(_pointAt(standsLast, 0), 1000)).toEqual(_sample(_expectedPoint(standsLast, 0), 1000));
    expect(_sample(_pointAt(sitsLast, 0), 1000)).not.toEqual(_sample(_pointAt(standsLast, 0), 1000));
  });

  it('starts inferred adjacent activities at the complete pointing duration', () => {
    const text = replaceSection(sameTimeText, 'itinerary', [
      '0:00:00 Sam points Jo slowly', ': points up quickly', ': waits 1'
    ]);
    const level = loadValidLevelForTest(text);
    const firstEnd = getPointDuration('slowly');
    const secondEnd = firstEnd + getPointDuration('quickly');
    expect(_pointAt(level, firstEnd)).toMatchObject({ startTime:firstEnd, endTime:secondEnd });
    const samI = level.timeline.characterIdToI.sam;
    expect(createKeyframeAtTime(level.timeline.keyframes, secondEnd).characters[samI].effects).toEqual([]);
    expect(level.timeline.startTime).toBe(0);
    expect(level.timeline.endTime).toBe(secondEnd + 1000);
  });

  it('rejects a subject activity in the resting stage', () => {
    const text = replaceSection(sameTimeText, 'itinerary', [
      '0:00:00 Sam points Jo slowly', '0:00:00 Jo waits 1.9', ': Sam sits'
    ]);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toContain('busy with "points" activity');
    expect(level).toBeNull();
  });

  it('allows a subject activity at the exact end of pointing', () => {
    const text = replaceSection(sameTimeText, 'itinerary', [
      '0:00:00 Sam points Jo slowly', '0:00:02 Sam sits'
    ]);
    const level = loadValidLevelForTest(text);
    const samI = level.timeline.characterIdToI.sam;
    const end = createKeyframeAtTime(level.timeline.keyframes, getPointDuration('slowly')).characters[samI];
    expect(end.bodyOrientation).toBe('sitting');
    expect(end.effects).toEqual([]);
    expect(level.timeline.endTime).toBe(getPointDuration('slowly'));
  });

  it('rejects an item that has entered inventory by pointing start', () => {
    const { level, errors } = loadLevelForTest(ownershipText, 'point-ownership.md');
    expect(errors.describeErrors()).toContain('Pointing target "paper" is unavailable');
    expect(errors.describeErrors()).toContain(
      `point-ownership.md:${ownershipText.split('\n').indexOf(': Sam points Paper slowly') + 1}:`);
    expect(level).toBeNull();
  });

  it('captures a target posture change authored later at the same timestamp', () => {
    const level = loadValidLevelForTest(sameTimeText);
    const point = _pointAt(level, 0);
    const frame = createKeyframeAtTime(level.timeline.keyframes, 0);
    expect(frame.characters[level.timeline.characterIdToI.jo].bodyOrientation).toBe('sitting');
    expect(_sample(point, point.startTime + (point.endTime - point.startTime) / 2))
      .toEqual(_sample(_expectedPoint(level, 0), 1000));

    const unchanged = loadValidLevelForTest(sameTimeText.replace('0:00:00 Jo sits', '0:00:00 Jo waits'));
    expect(_sample(point, 1000)).not.toEqual(_sample(_pointAt(unchanged, 0), 1000));
  });
});