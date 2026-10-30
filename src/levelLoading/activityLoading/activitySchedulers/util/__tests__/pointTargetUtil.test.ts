import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { createDefaultRoom } from '@/game/types/Room';
import { createDefaultItem } from '@/game/types/Item';
import { createDefaultMutableLevel } from '@/game/types/Level';
import ErrorCollector from '@/levelLoading/errorCollection/ErrorCollector';
import { addCharacterKeyChanges, addRoomKeyChanges, createEditableTimeline } from '@/levelLoading/timelineLoading/editingUtil';
import { resolvePointTarget } from '../pointTargetUtil';

function _setup() {
  const level = createDefaultMutableLevel();
  level.characters = [
    { ...createDefaultCharacter(), id:'sam', position:{ x:2, y:5, z:0 } },
    { ...createDefaultCharacter(), id:'jo', position:{ x:4, y:5, z:0 } }
  ];
  level.rooms = [{ ...createDefaultRoom(), id:'hall' }];
  const timeline = createEditableTimeline(level.characters, level.rooms, 0);
  const errors = new ErrorCollector('point', [{ filename:'point.md', lineNo:1 }]);
  return { level, timeline, errors };
}

describe('pointTargetUtil', () => {
  describe('resolvePointTarget()', () => {
    it('captures direction and subject pose without changing the body definition', () => {
      const { level, timeline, errors } = _setup();
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'direction', direction:'up' }, 0, 0, errors);

      expect(errors.describeErrors()).toBe('');
      expect(snapshot?.target).toEqual({ kind:'direction', direction:'up' });
      expect(snapshot?.subject.rootBodyPart).toBe(level.characters[0].rootBodyPart);
    });

    it('samples a moving character at the requested time and retains the snapshot after edits', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ position:{ x:4, y:5, z:0 } }, 1, 100, timeline);
      addCharacterKeyChanges({ position:{ x:8, y:5, z:0 } }, 1, 300, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'jo' }, 200, 0, errors);
      addCharacterKeyChanges({ position:{ x:9, y:5, z:0 } }, 1, 300, timeline);

      expect(snapshot?.characters[1].position.x).toBe(6);
      expect(snapshot?.movingCharacterIds.has('jo')).toBe(true);
      expect(snapshot?.target).toEqual({ kind:'character', characterId:'jo' });
    });

    it('captures subject facing and posture at start independently of later edits', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ facingDirection:'left', bodyOrientation:'laying' }, 0, 100, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'direction', direction:'right' }, 100, 0, errors);
      addCharacterKeyChanges({ facingDirection:'right', bodyOrientation:'standing' }, 0, 100, timeline);

      expect(snapshot?.subject.facingDirection).toBe('left');
      expect(snapshot?.subject.bodyOrientation).toBe('laying');
    });

    it('captures room items and support offsets without calculating stack positions', () => {
      const { level, timeline, errors } = _setup();
      const support = { ...createDefaultItem(), id:'table', stackOffset:{ x:1, y:-2, z:0 } };
      const vase = { ...createDefaultItem(), id:'vase', drawOffset:{ x:3, y:-1, z:0 } };
      addRoomKeyChanges({ items:[support, vase] }, 0, 100, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 100, 0, errors);
      addRoomKeyChanges({ items:[] }, 0, 100, timeline);

      expect(errors.describeErrors()).toBe('');
      expect(snapshot?.target).toEqual({ kind:'item', itemId:'vase' });
      expect(snapshot?.room.items).toEqual([support, vase]);
      expect(snapshot?.room.items[1].position).toEqual(vase.position);
    });

    it('resolves a left-hand item to its holder while character targets remain characters', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ leftHandItem:{ ...createDefaultItem(), id:'vase' } }, 1, 0, timeline);
      const held = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);
      const character = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'jo' }, 0, 0, errors);

      expect(errors.describeErrors()).toBe('');
      expect(held?.target).toEqual({ kind:'heldItem', holderId:'jo' });
      expect(character?.target).toEqual({ kind:'character', characterId:'jo' });
    });

    it('uses ownership at the requested start instead of subsequent ownership', () => {
      const { level, timeline, errors } = _setup();
      const item = { ...createDefaultItem(), id:'vase' };
      addCharacterKeyChanges({ rightHandItem:item }, 1, 0, timeline);
      addCharacterKeyChanges({ rightHandItem:null }, 1, 200, timeline);
      addCharacterKeyChanges({ rightHandItem:item }, 0, 200, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 100, 0, errors);

      expect(snapshot?.target).toEqual({ kind:'heldItem', holderId:'jo' });
      expect(snapshot?.characters[1].rightHandItem?.id).toBe('vase');
      expect(snapshot?.subject.rightHandItem).toBeNull();
    });

    it('allows self-targeting for later geometry validation', () => {
      const { level, timeline, errors } = _setup();
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'sam' }, 0, 0, errors);

      expect(errors.describeErrors()).toBe('');
      expect(snapshot?.target).toEqual({ kind:'character', characterId:'sam' });
    });

    it('reports an unknown character as a source-located authored error', () => {
      const { level, timeline, errors } = _setup();
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'missing' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.describeErrors()).toContain('point.md:1:0: Pointing target "missing" is unavailable');
    });

    it('rejects an item absent from the start snapshot', () => {
      const { level, timeline, errors } = _setup();
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'missing' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects inventory items even when their visibility flag is true', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ items:[{ ...createDefaultItem(), id:'vase' }] }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects invisible room items', () => {
      const { level, timeline, errors } = _setup();
      addRoomKeyChanges({ items:[{ ...createDefaultItem(), id:'vase', isVisible:false }] }, 0, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects an invisible held item even when its holder is visible', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ rightHandItem:{ ...createDefaultItem(), id:'vase', isVisible:false } }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects a room item in another room', () => {
      const { level, errors } = _setup();
      level.rooms.push({ ...createDefaultRoom(), id:'closet', rect:{ x:10, y:0, width:10, height:10 },
        items:[{ ...createDefaultItem(), id:'vase', position:{ x:15, y:5, z:0 } }] });
      const timeline = createEditableTimeline(level.characters, level.rooms, 0);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.describeErrors()).toContain('not in "hall" room');
    });

    it('rejects invisible character targets', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ isVisible:false }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'jo' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects a held item whose holder is invisible', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ isVisible:false, rightHandItem:{ ...createDefaultItem(), id:'vase' } }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.count).toBe(1);
    });

    it('rejects character targets outside the subject room', () => {
      const { level, timeline, errors } = _setup();
      addCharacterKeyChanges({ position:{ x:15, y:5, z:0 } }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'character', characterId:'jo' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.describeErrors()).toContain('not in "hall" room');
    });

    it('rejects a held item whose holder is in another room', () => {
      const { level, timeline, errors } = _setup();
      level.rooms.push({ ...createDefaultRoom(), id:'closet', rect:{ x:10, y:0, width:10, height:10 } });
      addCharacterKeyChanges({ position:{ x:15, y:5, z:0 }, leftHandItem:{ ...createDefaultItem(), id:'vase' } }, 1, 0, timeline);
      const snapshot = resolvePointTarget(level, timeline, 'sam', { kind:'item', itemId:'vase' }, 0, 0, errors);

      expect(snapshot).toBeNull();
      expect(errors.describeErrors()).toContain('not in "hall" room');
    });
  });
});