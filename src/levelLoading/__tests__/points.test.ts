import { describe, expect, it } from 'vitest';
import { assertNonNullable } from 'decent-portal';
import { createBodyPose, getResolvedBodyPart, getViewerArmPartKind, transformBodyPoint } from '@/game/characterBody';
import { findCharacterOwnedItem } from '@/game/itemOwnershipUtil';
import { ITEM_CUBOID_HEIGHT_GAME } from '@/game/itemSizeUtil';
import { createKeyframeAtTime } from '@/game/timeline';
import { getPointDuration } from '@/game/effects/pointEffectUtil';
import baseText from './fixtures/gives/gives-base.md?raw';
import pointsBaseText from './fixtures/points-base.md?raw';
import directionsText from './fixtures/points-directions.md?raw';
import concurrentText from './fixtures/points-concurrent.md?raw';
import itemTransferText from './fixtures/points-item-transfer.md?raw';
import { loadLevelForTest, replaceSection } from './testLevelUtil';

function _load(activity:string) {
  return loadLevelForTest(replaceSection(baseText, 'itinerary', [activity]), 'points.md');
}

describe('level loading - points activities', () => {
  it('creates one subject-owned effect without moving or turning the subject', () => {
    const { level, errors } = _load('0:00:00 Sam points left');
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 0);
    const samI = level!.timeline.characterIdToI.sam;
    expect(snapshot.characters[samI].effects).toMatchObject([{ kind:'point' }]);
    expect(snapshot.characters[samI].position).toEqual(level!.characters[samI].position);
    expect(snapshot.characters[samI].facingDirection).toBe(level!.characters[samI].facingDirection);
    expect(snapshot.characters[samI].leftHandItem?.id).toBe('key');
    expect(snapshot.characters[samI].rightHandItem?.id).toBe('vase');
    expect(level!.timeline.endTime).toBe(getPointDuration());
  });

  it('accepts all eight directions, optional at/to, and inferred subjects', () => {
    const { level, errors } = loadLevelForTest(directionsText);
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const effects = new Set(level!.timeline.keyframes.flatMap(frame => frame.characters[0].effects));
    expect(effects.size).toBe(8);
    expect(level!.timeline.endTime).toBe(8 * getPointDuration());
    expect(createKeyframeAtTime(level!.timeline.keyframes, getPointDuration()).characters[0].effects)
      .toMatchObject([{ kind:'point', startTime:getPointDuration() }]);
  });

  it('uses the complete quick duration', () => {
    const { level, errors } = _load('0:00:00 Sam points up quickly');
    expect(errors.describeErrors()).toBe('');
    expect(level?.timeline.endTime).toBe(getPointDuration('quickly'));
  });

  it('uses the complete slow duration', () => {
    const { level, errors } = _load('0:00:00 Sam points down slowly');
    expect(errors.describeErrors()).toBe('');
    expect(level?.timeline.endTime).toBe(getPointDuration('slowly'));
  });

  it('accepts a normalized character target with at', () => {
    const { level, errors } = _load('0:00:00 Sam points at JO');
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('accepts a room item target with to', () => {
    const text = replaceSection(pointsBaseText, 'itinerary', ['0:00:00 Sam points to Vase']);
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('accepts a held item target without a grammatical connector', () => {
    const { level, errors } = _load('0:00:00 Sam points Feather');
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
  });

  it('allows the target character to act during the gesture', () => {
    const { level, errors } = loadLevelForTest(concurrentText);
    expect(errors.describeErrors()).toBe('');
    expect(level).not.toBeNull();
    const snapshot = createKeyframeAtTime(level!.timeline.keyframes, 1000);
    expect(snapshot.characters[level!.timeline.characterIdToI.sam].effects).toMatchObject([{ kind:'point' }]);
    expect(snapshot.characters[level!.timeline.characterIdToI.jo].effects).toEqual([]);
  });

  it('allows the targeted item to be transferred during the gesture', () => {
    const { level, errors } = loadLevelForTest(itemTransferText);
    expect(errors.describeErrors()).toBe('');
    assertNonNullable(level);
    const start = createKeyframeAtTime(level.timeline.keyframes, 1000);
    const joI = level.timeline.characterIdToI.jo;
    const patI = level.timeline.characterIdToI.pat;
    expect(findCharacterOwnedItem(start.characters[joI], 'paper')).not.toBeNull();
    expect(start.characters[level.timeline.characterIdToI.sam].effects).toMatchObject([{ kind:'point' }]);
    const give = start.characters[joI].effects.find(effect => effect.kind === 'giveItem');
    assertNonNullable(give);
    expect(give.startTime).toBeLessThan(getPointDuration('slowly'));

    const after = createKeyframeAtTime(level.timeline.keyframes, give.endTime);
    expect(findCharacterOwnedItem(after.characters[joI], 'paper')).toBeNull();
    expect(findCharacterOwnedItem(after.characters[patI], 'paper')).not.toBeNull();
  });

  it('reports coincident geometry at the pointing line and returns no level', () => {
    const control = loadLevelForTest(pointsBaseText);
    expect(control.errors.describeErrors()).toBe('');
    assertNonNullable(control.level);
    const subject = control.level.characters.find(character => character.id === 'sam');
    const item = control.level.rooms.flatMap(room => room.items).find(candidate => candidate.id === 'vase');
    assertNonNullable(subject);
    assertNonNullable(item);
    const arm = getResolvedBodyPart(createBodyPose(subject.rootBodyPart,
      subject.bodyOrientation, subject.facingDirection), getViewerArmPartKind(subject, 'viewerFrontArm'));
    const pivot = transformBodyPoint(arm.transform, arm.part.pivotPoint);
    const itemHeading = ['## Vase',
      `* drawOffsetX=${subject.position.x + pivot[0] - item.position.x}`,
      `* drawOffsetY=${subject.position.y + pivot[1] + ITEM_CUBOID_HEIGHT_GAME / 2 - item.position.y}`].join('\n');
    const activity = '0:00:00 Sam points Vase';
    const text = pointsBaseText.replace('## Vase', itemHeading).replace('0:00:00 Sam points left', activity);
    const { level, errors } = loadLevelForTest(text, 'coincident-point.md');

    expect(errors.describeErrors()).toContain('Pointing target coincides with the arm pivot.');
    expect(errors.describeErrors()).toContain(`coincident-point.md:${text.split('\n').indexOf(activity) + 1}:`);
    expect(errors.count).toBe(1);
    expect(level).toBeNull();
  });

  it('rejects a subject conflict before the complete animation ends', () => {
    const text = concurrentText.replace('0:00:01 Jo waits', '0:00:01 Sam waits');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toContain('they are busy with "points" activity');
    expect(level).toBeNull();
  });

  it('reports an invisible subject through real loading', () => {
    const text = pointsBaseText.replace('## Sam', '## Sam\n* visible=false');
    const { level, errors } = loadLevelForTest(text, 'invisible-pointer.md');
    expect(errors.describeErrors()).toContain('"sam" character is unavailable for pointing.');
    expect(errors.describeErrors()).toContain(`invisible-pointer.md:${text.split('\n').indexOf('0:00:00 Sam points left') + 1}:`);
    expect(level).toBeNull();
  });

  it('rejects an unplaced subject as authored input rather than asserting', () => {
    const text = replaceSection(pointsBaseText, 'itinerary', ['0:00:00 Pat points left']).replace('## Jo', '## Pat\n## Jo');
    const { level, errors } = loadLevelForTest(text);
    expect(errors.describeErrors()).toContain('"pat" character is not placed in a room');
    expect(level).toBeNull();
  });

  it('rejects a target in a different room', () => {
    const { level, errors } = _load('0:00:00 Sam points Pat');
    expect(errors.describeErrors()).toContain('Pointing target "pat" is unavailable or not in "hall" room.');
    expect(level).toBeNull();
  });

  it('rejects hidden inventory targets', () => {
    const { level, errors } = _load('0:00:00 Sam points Book');
    expect(errors.describeErrors()).toContain('Pointing target "book" is unavailable');
    expect(level).toBeNull();
  });

  it('rejects unknown targets with a parse error', () => {
    const { level, errors } = _load('0:00:00 Sam points Missing');
    expect(errors.hasErrors).toBe(true);
    expect(level).toBeNull();
  });

  it('rejects missing targets', () => {
    const { level, errors } = _load('0:00:00 Sam points');
    expect(errors.hasErrors).toBe(true);
    expect(level).toBeNull();
  });

  it('rejects unsupported speed words', () => {
    const { level, errors } = _load('0:00:00 Sam points left fast');
    expect(errors.hasErrors).toBe(true);
    expect(level).toBeNull();
  });
});