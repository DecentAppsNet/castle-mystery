import { assertNonNullable } from 'decent-portal';
import { describe, expect, it } from 'vitest';

import { setSeed } from '@/common/randUtil';
import { getHandArmPartKind } from '@/game/characterBody';
import CharacterEffectDrawContext from '@/game/effects/types/CharacterEffectDrawContext';
import { createKeyframeAtTime } from '@/game/timeline';
import ScalingFactors from '@/game/types/ScalingFactors';
import baseText from './fixtures/emits/emits-base.md?raw';
import rasterText from './fixtures/characters-raster.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';

function _sampleSpeech(text:string, itinerary:readonly string[]) {
  setSeed(407);
  const activities = itinerary.map(activity => activity.replace('The doom awaits you.', 'The doom awaits you. '.repeat(50)));
  const level = loadValidLevelForTest(replaceSection(text, 'itinerary', activities));
  const characterI = level.timeline.characterIdToI.sam;
  const effect = level.timeline.keyframes.flatMap(frame => frame.characters[characterI].effects)
    .find(candidate => candidate.kind === 'says');
  assertNonNullable(effect);
  const speaker = createKeyframeAtTime(level.timeline.keyframes, effect.startTime).characters[characterI];
  const character = level.characters.find(candidate => candidate.id === 'sam');
  assertNonNullable(character);
  const leftArm = getHandArmPartKind(character.rootBodyPart.imageUrl !== null, speaker.facingDirection, 'left');
  const characterContext = {
    bodyOrientation:speaker.bodyOrientation,
    isNearArmHoldingItem:(leftArm === 'nearArm' ? speaker.leftHandItem : speaker.rightHandItem) !== null,
    isFarArmHoldingItem:(leftArm === 'farArm' ? speaker.leftHandItem : speaker.rightHandItem) !== null
  } as CharacterEffectDrawContext;
  const handler = effect.handler;
  assertNonNullable(handler);
  const targets = Array.from({ length:Math.ceil(effect.endTime - effect.startTime) }, (_, elapsed) => handler({
    stage:'beforeCharacter', characterContext
  }, {} as ScalingFactors, effect.startTime + elapsed, 0, {} as CanvasRenderingContext2D)?.spriteOverrides ?? []).flat();
  return { speaker, effect, targets:new Set(targets.map(override => override.spriteKind)) };
}

function _sampleTargets(text:string, itinerary:readonly string[] = ['0:00:00 Sam says "The doom awaits you."']) {
  return _sampleSpeech(text, itinerary).targets;
}

function _expectConflict(itinerary:readonly string[], message:string) {
  const { level, errors } = loadLevelForTest(replaceSection(baseText, 'itinerary', itinerary));
  expect(level).toBeNull();
  expect(errors.describeErrors()).toContain(message);
}

describe('level loading - held items during speech', () => {
  it('suppresses both occupied arms', () => {
    expect(_sampleTargets(baseText)).toEqual(new Set(['head']));
  });

  it('suppresses the left-hand arm for right-facing vector bodies', () => {
    expect(_sampleTargets(baseText.replace('* rightHand=Right Bell', '')))
      .toEqual(new Set(['head', 'nearArm']));
  });

  it('keeps vector hand ownership unchanged when facing left', () => {
    expect(_sampleTargets(baseText.replace('* rightHand=Right Bell', ''), [
      '0:00:00 Sam says "The doom awaits you."', '0:00:00 Sam faces left'
    ])).toEqual(new Set(['head', 'nearArm']));
  });

  it('suppresses the right-hand arm while leaving the left-hand arm free', () => {
    expect(_sampleTargets(baseText.replace('* leftHand=Left Bell', '')))
      .toEqual(new Set(['head', 'farArm']));
  });

  it('does not suppress gestures for inventory-only items', () => {
    expect(_sampleTargets(baseText.replace('* leftHand=Left Bell', '').replace('* rightHand=Right Bell', '')))
      .toEqual(new Set(['head', 'nearArm', 'farArm']));
  });

  it('uses completed occupancy after a legal same-time inventory-to-hand transfer in either authored order', () => {
    const text = baseText.replace('* rightHand=Right Bell', '');
    const result = _sampleSpeech(text, [
      '0:00:00 Sam says "The doom awaits you."', '0:00:00 Sam takes Inventory Bell into right hand'
    ]);
    expect(result.speaker.rightHandItem?.id).toBe('inventory bell');
    expect(result.targets).toEqual(new Set(['head']));
    expect(_sampleTargets(text, [
      '0:00:00 Sam takes Inventory Bell into right hand', '0:00:00 Sam says "The doom awaits you."'
    ])).toEqual(new Set(['head']));
  });

  it('suppresses the left-hand far arm for right-facing raster bodies', () => {
    const text = rasterText.replace('## Sam', '## Sam\n* leftHand=Bell')
      .replace('# items', '# items\n## Bell');
    expect(_sampleTargets(text)).toEqual(new Set(['head', 'nearArm']));
  });

  it('uses completed raster arm mapping after a legal same-time facing change in either authored order', () => {
    const text = rasterText.replace('## Sam', '## Sam\n* leftHand=Bell')
      .replace('# items', '# items\n## Bell');
    const result = _sampleSpeech(text, [
      '0:00:00 Sam says "The doom awaits you."', '0:00:00 Sam faces left'
    ]);
    expect(result.speaker.facingDirection).toBe('left');
    expect(result.speaker.leftHandItem?.id).toBe('bell');
    expect(result.targets).toEqual(new Set(['head', 'farArm']));
    expect(_sampleTargets(text, [
      '0:00:00 Sam faces left', '0:00:00 Sam says "The doom awaits you."'
    ])).toEqual(new Set(['head', 'farArm']));
  });

  it('suppresses the right-hand far arm for left-facing raster bodies', () => {
    const text = rasterText.replace('## Sam', '## Sam\n* rightHand=Bell\n* facing=left')
      .replace('# items', '# items\n## Bell');
    expect(_sampleTargets(text)).toEqual(new Set(['head', 'nearArm']));
  });

  it('uses facing set by targeted speech when mapping raster hands', () => {
    const text = rasterText.replace('..S.', 'J.S.').replace('* S=Sam', '* S=Sam\n* J=Jo')
      .replace('## Sam', '## Jo\n## Sam\n* leftHand=Bell').replace('# items', '# items\n## Bell');
    const result = _sampleSpeech(text, ['0:00:00 Sam says "The doom awaits you." to Jo']);
    expect(result.speaker.facingDirection).toBe('left');
    expect(result.targets).toEqual(new Set(['head', 'farArm']));
  });

  it('rejects taking a floor item at speech start because both activities have duration', () => {
    _expectConflict([
      '0:00:00 Sam says "The doom awaits you."', '0:00:00 Sam takes Floor Bell into right hand'
    ], 'sam can\'t take because they are busy saying');
  });

  it('rejects inventory-to-hand movement strictly inside speech', () => {
    _expectConflict([
      '0:00:00 Sam says "The doom awaits you."', '0:00:01 Sam takes Inventory Bell into right hand'
    ], 'sam can\'t take because they are busy saying');
  });

  it('rejects facing changes strictly inside speech', () => {
    _expectConflict([
      '0:00:00 Sam says "The doom awaits you."', '0:00:01 Sam faces left'
    ], 'sam can\'t face because they are busy saying');
  });

  it('rejects the proposed wait-relative-speech itinerary because taking conflicts with waiting', () => {
    _expectConflict([
      '0:11:00 Sam waits 3', ': Sam says "The doom awaits you."',
      '0:11:01 Sam takes Inventory Bell into left hand'
    ], 'sam can\'t take because they are busy with "waits" activity');
  });

  it('resorts an earlier take before relative speech when another character is waiting', () => {
    const text = baseText.replace('B.S.', 'B.GS').replace('* S=Sam', '* S=Sam\n* G=Ghost')
      .replace('* rightHand=Right Bell', '');
    const result = _sampleSpeech(text, [
      '0:11:00 Ghost waits 3', ': Sam says "The doom awaits you."',
      '0:11:01 Sam takes Inventory Bell into right hand'
    ]);
    expect(result.effect.startTime).toBe(663000);
    expect(result.speaker.rightHandItem?.id).toBe('inventory bell');
    expect(result.targets).toEqual(new Set(['head']));
  });
});