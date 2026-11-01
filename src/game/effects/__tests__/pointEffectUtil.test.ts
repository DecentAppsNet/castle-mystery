import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';
import { createBodyPose, getResolvedBodyPart, transformBodyPoint } from '@/game/characterBody';
import { ITEM_CUBOID_HEIGHT_GAME } from '@/game/itemSizeUtil';
import PointStartSnapshot from '../types/PointStartSnapshot';

import CharacterAnatomyContext from '../types/CharacterAnatomyContext';
import SpriteOverride from '../types/SpriteOverride';
import Effect from '../types/Effect';
import { createPointEffect as createSnapshotPointEffect, getPointDuration } from '../pointEffectUtil';

type RotationOverride = Extract<SpriteOverride, { transformType:'rotate' }>;

function _snapshot(direction:'left'|'right' = 'left'):PointStartSnapshot {
  const subject = { ...createDefaultCharacter(), id:'sam', position:{ x:2, y:5, z:0 } };
  return { subject, room:createDefaultRoom(), characters:[subject], movingCharacterIds:new Set(),
    target:{ kind:'direction', direction } };
}

function _createEffect(speed:'quickly'|'slowly'|null = null):Effect {
  const effect = createSnapshotPointEffect(100, _snapshot(), speed);
  expect(effect).not.toBeNull();
  return effect!;
}

const CHARACTER_CONTEXT:CharacterAnatomyContext = {
  bodyOrientation:'standing', isNearArmHoldingItem:false, isFarArmHoldingItem:false
};

function _query(effect:Effect|null, time:number, metaTime = 0) {
  expect(effect?.anatomyHandler).toEqual(expect.any(Function));
  return effect!.anatomyHandler!(CHARACTER_CONTEXT, time, metaTime);
}

function _rotation(effect:Effect, time:number):number {
  const result = _query(effect, time);
  const override = result[0];
  expect(override).toMatchObject({ transformType:'rotate' });
  return (override as RotationOverride).rotateRadians;
}

describe('pointEffectUtil', () => {
  describe('createPointEffect()', () => {
    it('uses the complete default timing profile', () => {
      const duration = getPointDuration();
      const effect = _createEffect();

      expect(effect.kind).toBe('point');
      expect(effect.endTime - effect.startTime).toBe(duration);
    });

    it('uses the complete quick timing profile', () => {
      const duration = getPointDuration('quickly');
      const effect = _createEffect('quickly');

      expect(effect.endTime - effect.startTime).toBe(duration);
    });

    it('uses the complete slow timing profile', () => {
      const duration = getPointDuration('slowly');
      const effect = _createEffect('slowly');

      expect(effect.endTime - effect.startTime).toBe(duration);
    });

    it('emits only a relative viewer-front-arm rotation', () => {
      const effect = _createEffect();

      expect(_query(effect, 100 + getPointDuration() / 2)).toEqual([
        { spriteKind:'viewerFrontArm', transformType:'rotate', rotateRadians:expect.any(Number) }
      ]);
    });

    it('requests the viewer-front arm when facing left', () => {
      const base = _snapshot();
      const subject = { ...base.subject, facingDirection:'left' as const };
      const effect = createSnapshotPointEffect(100, { ...base, subject, characters:[subject] });
      expect(effect).not.toBeNull();

      expect(_query(effect, 100 + getPointDuration() / 2)[0].spriteKind)
        .toBe('viewerFrontArm');
    });

    it('advances to the captured angle, holds it, and returns toward rest', () => {
      const effect = _createEffect();
      const duration = getPointDuration();
      const heldAngle = _rotation(effect, effect.startTime + duration / 2);
      expect(heldAngle).not.toBe(0);
      const samples = Array.from({ length:101 }, (_, sampleI) =>
        _rotation(effect, effect.startTime + duration * sampleI / 100) / heldAngle);
      const firstHoldI = samples.indexOf(1);
      const lastHoldI = samples.lastIndexOf(1);

      expect(samples[0]).toBe(0);
      expect(samples.at(-1)).toBe(0);
      expect(firstHoldI).toBeGreaterThan(1);
      expect(lastHoldI).toBeGreaterThan(firstHoldI);
      expect(lastHoldI).toBeLessThan(samples.length - 2);
      expect(samples.slice(0, firstHoldI + 1)).toEqual(
        [...samples.slice(0, firstHoldI + 1)].sort((first, second) => first - second));
      expect(samples.slice(firstHoldI, lastHoldI + 1).every(angle => angle === 1)).toBe(true);
      expect(samples.slice(lastHoldI)).toEqual(
        [...samples.slice(lastHoldI)].sort((first, second) => second - first));
      expect(samples.some(angle => angle > 0 && angle < 1)).toBe(true);
    });

    it('leaves the resolved pose unchanged outside its interval', () => {
      const effect = _createEffect();

      expect(_query(effect, effect.startTime - 1)).toEqual([]);
      expect(_query(effect, effect.endTime + 1)).toEqual([]);
    });

    it('has only an anatomy handler and no drawing-stage dependency', () => {
      const effect = _createEffect();

      expect(effect.drawHandler).toBeNull();
      expect(effect.anatomyHandler).toEqual(expect.any(Function));
    });

    it('reproduces results after reverse and repeated queries regardless of meta time', () => {
      const effect = _createEffect();
      const duration = getPointDuration();
      const sampleTime = effect.startTime + duration / 10;
      const first = _query(effect, sampleTime, 10);

      _query(effect, effect.endTime - duration / 10, 20);
      _query(effect, effect.endTime, 30);
      _query(effect, effect.startTime, 40);
      expect(_query(effect, sampleTime, 10000)).toEqual(first);
      expect(_query(effect, sampleTime, 10000)).toEqual(first);
      expect(_query(_createEffect(), sampleTime)).toEqual(first);
    });

    it('captures character geometry before the first handler evaluation', () => {
      const snapshot = _snapshot();
      const target = { ...snapshot.subject, id:'jo', position:{ x:7, y:5, z:0 } };
      const entitySnapshot:PointStartSnapshot = { ...snapshot, characters:[snapshot.subject, target],
        target:{ kind:'character', characterId:'jo' } };
      const effect = createSnapshotPointEffect(100, entitySnapshot);
      const control = createSnapshotPointEffect(100, entitySnapshot);
      expect(effect).not.toBeNull();
      expect(control).not.toBeNull();
      target.position.x = -100;

      expect(_query(effect, 100 + getPointDuration() / 2)).toEqual(
        _query(control, 100 + getPointDuration() / 2));
    });

    it('captures stacked room-item geometry before the first handler evaluation', () => {
      const snapshot = _snapshot();
      const support = { ...createDefaultItem(), id:'table', position:{ x:8, y:5, z:0 } };
      const item = { ...createDefaultItem(), id:'vase', position:{ x:8, y:5, z:0 } };
      const entitySnapshot:PointStartSnapshot = { ...snapshot, room:{ ...snapshot.room, items:[support, item] },
        target:{ kind:'item', itemId:'vase' } };
      const effect = createSnapshotPointEffect(100, entitySnapshot);
      const control = createSnapshotPointEffect(100, entitySnapshot);
      expect(effect).not.toBeNull();
      expect(control).not.toBeNull();
      support.drawOffset.y = -100;
      item.position.x = -100;

      expect(_query(effect, 100 + getPointDuration() / 2)).toEqual(
        _query(control, 100 + getPointDuration() / 2));
    });

    it('captures the held-item holder rather than following later holder movement', () => {
      const snapshot = _snapshot();
      const holder = { ...snapshot.subject, id:'jo', position:{ x:7, y:5, z:0 } };
      const entitySnapshot:PointStartSnapshot = { ...snapshot, characters:[snapshot.subject, holder],
        target:{ kind:'heldItem', holderId:'jo' } };
      const effect = createSnapshotPointEffect(100, entitySnapshot);
      const control = createSnapshotPointEffect(100, entitySnapshot);
      expect(effect).not.toBeNull();
      expect(control).not.toBeNull();
      holder.position.x = -100;

      expect(_query(effect, 100 + getPointDuration() / 2)).toEqual(
        _query(control, 100 + getPointDuration() / 2));
    });

    it('returns an explicit invalid result for an item coincident with the arm pivot', () => {
      const snapshot = _snapshot();
      const arm = getResolvedBodyPart(createBodyPose(snapshot.subject.rootBodyPart, 'standing', 'right'), 'nearArm');
      const pivot = transformBodyPoint(arm.transform, arm.part.pivotPoint);
      const item = { ...createDefaultItem(), id:'vase', position:{ x:8, y:5, z:0 },
        drawOffset:{ x:snapshot.subject.position.x + pivot[0] - 8,
          y:snapshot.subject.position.y + pivot[1] + ITEM_CUBOID_HEIGHT_GAME / 2 - 5, z:0 } };
      const coincident:PointStartSnapshot = { ...snapshot, room:{ ...snapshot.room, items:[item] },
        target:{ kind:'item', itemId:'vase' } };

      expect(createSnapshotPointEffect(100, coincident)).toBeNull();
    });

    it('uses the front-arm pivot for left-facing target validation', () => {
      const base = _snapshot();
      const subject = { ...base.subject, facingDirection:'left' as const };
      const arm = getResolvedBodyPart(createBodyPose(subject.rootBodyPart, 'standing', 'left'), 'farArm');
      const pivot = transformBodyPoint(arm.transform, arm.part.pivotPoint);
      const item = { ...createDefaultItem(), id:'vase', position:{ x:8, y:5, z:0 },
        drawOffset:{ x:subject.position.x + pivot[0] - 8,
          y:subject.position.y + pivot[1] + ITEM_CUBOID_HEIGHT_GAME / 2 - 5, z:0 } };

      expect(createSnapshotPointEffect(100, { ...base, subject, characters:[subject],
        room:{ ...base.room, items:[item] }, target:{ kind:'item', itemId:'vase' } })).toBeNull();
    });
  });
});