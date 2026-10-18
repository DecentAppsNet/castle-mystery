import { describe, expect, it } from 'vitest';

import { createKeyframeAtTime } from '@/game/timeline';
import baseText from './fixtures/emits/emits-base.md?raw';
import { loadLevelForTest, loadValidLevelForTest, replaceSection } from './testLevelUtil';

function _expectSameTiming(markedActivity:string, plainActivity:string, kind:string) {
  const marked = loadValidLevelForTest(replaceSection(baseText, 'itinerary', [markedActivity, ': Sam waits .5']));
  const plain = loadValidLevelForTest(replaceSection(baseText, 'itinerary', [plainActivity, ': Sam waits .5']));
  const samI = marked.timeline.characterIdToI.sam;
  const markedEffect = createKeyframeAtTime(marked.timeline.keyframes, 0).characters[samI].effects
    .find(effect => effect.kind === kind)!;
  const plainEffect = createKeyframeAtTime(plain.timeline.keyframes, 0).characters[samI].effects
    .find(effect => effect.kind === kind)!;

  expect(markedEffect).toBeDefined();
  expect(plainEffect).toBeDefined();
  expect(markedEffect.startTime).toBe(plainEffect.startTime);
  expect(markedEffect.endTime).toBe(plainEffect.endTime);
  expect(markedEffect.endTime).toBe(1800);
  expect(marked.timeline.endTime).toBe(plain.timeline.endTime);
  expect(marked.timeline.endTime).toBe(2300);
}

function _expectSourceError(activityText:string, message:string) {
  const text = replaceSection(baseText, 'itinerary', [activityText]);
  const lineNo = text.split('\n').indexOf(activityText) + 1;
  const { level, errors } = loadLevelForTest(text, 'animations.md');

  expect(level).toBeNull();
  expect(errors.describeErrors()).toBe(`animations.md:${lineNo}:0: ${message}`);
}

describe('level loading - speech text animations', () => {
  it('uses visible shorthand speech for effect and successor timing', () => {
    _expectSameTiming('0:00:00 Sam says "The *doom* awaits you."',
      '0:00:00 Sam says "The doom awaits you."', 'says');
  });

  it('accepts shorthand in thoughts', () => {
    _expectSameTiming('0:00:00 Sam thinks "The *doom* awaits you."',
      '0:00:00 Sam thinks "The doom awaits you."', 'thinks');
  });

  it('accepts shorthand in loud held-item emissions', () => {
    _expectSameTiming('0:00:00 Right Bell emits "The *doom* awaits you." loudly',
      '0:00:00 Right Bell emits "The doom awaits you." loudly', 'emits');
  });

  it('reports unclosed shorthand at the activity source line', () => {
    _expectSourceError('0:00:00 Sam says "We *need help."', 'Unclosed text animation "emphasis".');
  });

  it('uses visible speech for effect and successor timing', () => {
    _expectSameTiming('0:00:00 Sam says "The [tense]doom[/] awaits you."',
      '0:00:00 Sam says "The doom awaits you."', 'says');
  });

  it('uses visible thoughts for effect and successor timing', () => {
    _expectSameTiming('0:00:00 Sam thinks "The [tense]doom[/] awaits you."',
      '0:00:00 Sam thinks "The doom awaits you."', 'thinks');
  });

  it('accepts named closing tags without affecting speech timing', () => {
    _expectSameTiming('0:00:00 Sam says "The [tense]doom[/tense] awaits you."',
      '0:00:00 Sam says "The doom awaits you."', 'says');
  });

  it('reports mismatched closing names at the activity source line', () => {
    _expectSourceError('0:00:00 Sam thinks "[tense]doom[/pulse]"',
      'Text animation closing tag "pulse" does not match "tense".');
  });

  it('uses visible character emissions for effect and successor timing', () => {
    _expectSameTiming('0:00:00 Sam emits "The [tense]doom[/] awaits you."',
      '0:00:00 Sam emits "The doom awaits you."', 'emits');
  });

  it('preserves loud held-item emission syntax and timing', () => {
    _expectSameTiming('0:00:00 Right Bell emits "The [tense]doom[/] awaits you." loudly',
      '0:00:00 Right Bell emits "The doom awaits you." loudly', 'emits');
  });

  it('handles multiple spans in floor-item emissions', () => {
    _expectSameTiming('0:00:00 Floor Bell emits "[tense]The[/] doom [tense]awaits[/] you."',
      '0:00:00 Floor Bell emits "The doom awaits you."', 'emits');
  });

  it('preserves targeted-speech facing and duration', () => {
    const targetedBase = baseText.replace('B.S.', 'B.GS').replace('* S=Sam', '* S=Sam\n* G=Ghost');
    const marked = loadValidLevelForTest(replaceSection(targetedBase, 'itinerary', [
      '0:00:00 Sam says "The [tense]doom[/] awaits you." to Ghost'
    ]));
    const plain = loadValidLevelForTest(replaceSection(targetedBase, 'itinerary', [
      '0:00:00 Sam says "The doom awaits you." to Ghost'
    ]));
    const samI = marked.timeline.characterIdToI.sam;
    const speaker = createKeyframeAtTime(marked.timeline.keyframes, 0).characters[samI];
    const plainSpeaker = createKeyframeAtTime(plain.timeline.keyframes, 0).characters[samI];

    expect(speaker.facingDirection).toBe('left');
    expect(speaker.facingDirection).toBe(plainSpeaker.facingDirection);
    expect(marked.timeline.endTime).toBe(plain.timeline.endTime);
    expect(marked.timeline.endTime).toBe(1800);
  });

  it('continues counting UTF-16 code units rather than graphemes for duration', () => {
    const level = loadValidLevelForTest(replaceSection(baseText, 'itinerary', [
      '0:00:00 Sam thinks "[tense]\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}[/]"'
    ]));

    expect(level.timeline.endTime).toBe(14 * 90);
  });

  it('reports invalid speech markup at its activity line', () => {
    _expectSourceError('0:00:00 Sam says "[pulse]doom[/]"', 'Unknown text animation "pulse".');
  });

  it('reports invalid thought markup at its activity line', () => {
    _expectSourceError('0:00:00 Sam thinks "[tense]doom"', 'Unclosed text animation "tense".');
  });

  it('reports invalid emission markup at its activity line', () => {
    _expectSourceError('0:00:00 Right Bell emits "doom[/]" loudly', 'Unmatched text animation closing tag.');
  });
});