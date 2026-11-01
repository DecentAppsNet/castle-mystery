import { describe, expect, it } from 'vitest';
import { createDefaultCharacterBody, replaceHeadImage } from '@/game/characterBody';
import rasterText from './fixtures/characters-raster.md?raw';
import { loadLevelForTest, loadValidLevelForTest } from './testLevelUtil';

describe('character body loading', () => {
  it('activates a complete Duchess-style definition with one uniform scale', () => {
    const root = loadValidLevelForTest(rasterText).characters[0].rootBodyPart;
    const scale = root.width / 484;
    expect(root.imageUrl).toBe('/assets/bodies/duchessTest_torso.png');
    expect(root.height).toBeCloseTo(635 * scale);
    expect(root.pivotPoint).toEqual([273 * scale, 334 * scale]);
    const head = root.connectedParts[0];
    expect(head.part.imageUrl).toBe('/assets/bodies/duchessTest_head.png');
    expect(head.part.width).toBeCloseTo(282 * scale);
    expect(head.connectionPoint).toEqual([250 * scale, 25 * scale]);
    expect(root.connectedParts[1].part.kind).toBe('farArm');
    expect(root.connectedParts[1].part.imageUrl).toBe('/assets/bodies/duchessTest_farArm.png');
    expect(root.connectedParts[1].connectionPoint).toEqual([360 * scale, 149 * scale]);
    expect(root.connectedParts[2].part.kind).toBe('nearArm');
    expect(root.connectedParts[2].part.imageUrl).toBe('/assets/bodies/duchessTest_nearArm.png');
    expect(root.connectedParts[2].connectionPoint).toEqual([139 * scale, 161 * scale]);
    expect(root.connectedParts).toHaveLength(5);
  });

  it('scales authored hand connections from each arm image origin', () => {
    const root = loadValidLevelForTest(rasterText).characters[0].rootBodyPart;
    const scale = root.width / 484;
    expect(root.connectedParts[1].part.connectedParts[0].connectionPoint).toEqual([40 * scale, 165 * scale]);
    expect(root.connectedParts[2].part.connectedParts[0].connectionPoint).toEqual([63 * scale, 176 * scale]);
  });

  it('keeps complete raster anatomy when both hand connections are omitted', () => {
    const text = rasterText.replace('* nearHandConnection=63,176', '').replace('* farHandConnection=40,165', '');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root.imageUrl).toBe('/assets/bodies/duchessTest_torso.png');
    expect(root.connectedParts[1].part.connectedParts[0].part.kind).toBe('farHand');
    expect(root.connectedParts[2].part.connectedParts[0].part.kind).toBe('nearHand');
  });

  it('defaults only the near hand when its connection is omitted', () => {
    const text = rasterText.replace('* nearHandConnection=63,176', '');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    const defaults = loadValidLevelForTest(text.replace('* farHandConnection=40,165', '')).characters[0].rootBodyPart;
    expect(root.connectedParts[2].part.connectedParts[0].connectionPoint)
      .toEqual(defaults.connectedParts[2].part.connectedParts[0].connectionPoint);
    const scale = root.width / 484;
    expect(root.connectedParts[1].part.connectedParts[0].connectionPoint).toEqual([40 * scale, 165 * scale]);
  });

  it('defaults only the far hand when its connection is omitted', () => {
    const text = rasterText.replace('* farHandConnection=40,165', '');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    const defaults = loadValidLevelForTest(text.replace('* nearHandConnection=63,176', '')).characters[0].rootBodyPart;
    expect(root.connectedParts[1].part.connectedParts[0].connectionPoint)
      .toEqual(defaults.connectedParts[1].part.connectedParts[0].connectionPoint);
    const scale = root.width / 484;
    expect(root.connectedParts[2].part.connectedParts[0].connectionPoint).toEqual([63 * scale, 176 * scale]);
  });

  it('accepts zero, negative, and out-of-image hand coordinates without changing body scale', () => {
    const text = rasterText.replace('* nearHandConnection=63,176', '* nearHandConnection=0,-100')
      .replace('* farHandConnection=40,165', '* farHandConnection=900,1000');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    const original = loadValidLevelForTest(rasterText).characters[0].rootBodyPart;
    const scale = root.width / 484;
    expect(root.width).toBe(original.width);
    expect(root.connectedParts[2].part.connectedParts[0].connectionPoint).toEqual([0, -100 * scale]);
    expect(root.connectedParts[1].part.connectedParts[0].connectionPoint).toEqual([900 * scale, 1000 * scale]);
  });

  it('rejects a supplied blank hand connection', () => {
    const text = rasterText.replace('* nearHandConnection=63,176', '* nearHandConnection=   ');
    const { level, errors } = loadLevelForTest(text, 'blank-hand.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('blank-hand.md:44:');
    expect(errors.describeErrors()).toContain('Expected nearHandConnection to contain exactly two finite numbers.');
  });

  it('rejects an empty hand coordinate', () => {
    const { level, errors } = loadLevelForTest(rasterText.replace('* farHandConnection=40,165', '* farHandConnection=,165'));
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected farHandConnection to contain exactly two finite numbers.');
  });

  it('rejects extra hand coordinates', () => {
    const { level, errors } = loadLevelForTest(rasterText.replace('* nearHandConnection=63,176', '* nearHandConnection=63,176,0'));
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected nearHandConnection to contain exactly two finite numbers.');
  });

  it('rejects nonfinite hand coordinates', () => {
    const { level, errors } = loadLevelForTest(rasterText.replace('* farHandConnection=40,165', '* farHandConnection=Infinity,165'));
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected farHandConnection to contain exactly two finite numbers.');
  });

  it('ignores malformed hand connections on incomplete raster anatomy with a head image', () => {
    const text = rasterText.replace('* torsoDimensions=484,635', '')
      .replace('* nearHandConnection=63,176', '* nearHandConnection=not a pair');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/duchessTest_head.png'));
  });

  it('ignores hand connections when the base head image is omitted', () => {
    const text = rasterText.replace('* headImage=duchessTest_head.png', '')
      .replace('* farHandConnection=40,165', '* farHandConnection=');
    expect(loadValidLevelForTest(text).characters[0].rootBodyPart).toEqual(createDefaultCharacterBody());
  });

  it('uses exact default geometry and only the authored head when a limb image is missing', () => {
    const text = rasterText.replace('* farArmImage=duchessTest_farArm.png', '');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/duchessTest_head.png'));
  });

  it('falls back when dimensions are missing and ignores malformed partial geometry', () => {
    const text = rasterText.replace('* torsoDimensions=484,635', '')
      .replace('* headPivot=160,202', '* headPivot=not a pair');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/duchessTest_head.png'));
  });

  it('falls back when a pivot is blank', () => {
    const text = rasterText.replace('* torsoPivot=273,334', '* torsoPivot=   ');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/duchessTest_head.png'));
  });

  it('falls back when a torso connection is missing', () => {
    const text = rasterText.replace('* torsoRightLegConnection=150,500', '');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    expect(root).toEqual(replaceHeadImage(createDefaultCharacterBody(), '/assets/bodies/duchessTest_head.png'));
  });

  it('keeps the headless default when the base head image is missing', () => {
    const text = rasterText.replace('* headImage=duchessTest_head.png', '');
    expect(loadValidLevelForTest(text).characters[0].rootBodyPart).toEqual(createDefaultCharacterBody());
  });

  it('rejects an invalid supplied filename even when geometry is incomplete', () => {
    const text = rasterText.replace('* torsoDimensions=484,635', '')
      .replace('* farArmImage=duchessTest_farArm.png', '* farArmImage=../arm.png');
    expect(() => loadLevelForTest(text)).toThrow('character body image must be a filename, not a path or URL');
  });

  it('rejects empty coordinates rather than coercing them to zero', () => {
    const text = rasterText.replace('* headPivot=160,202', '* headPivot=,202');
    const { level, errors } = loadLevelForTest(text, 'raster-empty-pivot.md');
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('raster-empty-pivot.md:23:');
    expect(errors.describeErrors()).toContain('Expected headPivot to contain exactly two finite numbers.');
  });

  it('rejects extra coordinates in a complete definition', () => {
    const text = rasterText.replace('* torsoHeadConnection=250,25', '* torsoHeadConnection=250,25,0');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected torsoHeadConnection');
  });

  it('rejects numeric prefixes with trailing text', () => {
    const text = rasterText.replace('* headDimensions=282,265', '* headDimensions=282oops,265');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected headDimensions');
  });

  it('rejects nonfinite coordinates', () => {
    const text = rasterText.replace('* headPivot=160,202', '* headPivot=Infinity,202');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected headPivot');
  });

  it('rejects NaN dimensions', () => {
    const text = rasterText.replace('* headDimensions=282,265', '* headDimensions=NaN,265');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('Expected headDimensions');
  });

  it('rejects zero dimensions', () => {
    const text = rasterText.replace('* headDimensions=282,265', '* headDimensions=0,265');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('positive finite numbers');
  });

  it('rejects negative dimensions', () => {
    const text = rasterText.replace('* headDimensions=282,265', '* headDimensions=282,-265');
    const { level, errors } = loadLevelForTest(text);
    expect(level).toBeNull();
    expect(errors.describeErrors()).toContain('positive finite numbers');
  });

  it('accepts finite negative and out-of-rectangle pivots and connections', () => {
    const text = rasterText.replace('* headPivot=160,202', '* headPivot=-100,900')
      .replace('* torsoHeadConnection=250,25', '* torsoHeadConnection=-200,1000');
    const root = loadValidLevelForTest(text).characters[0].rootBodyPart;
    const scale = root.width / 484;
    expect(root.connectedParts[0].part.pivotPoint).toEqual([-100 * scale, 900 * scale]);
    expect(root.connectedParts[0].connectionPoint).toEqual([-200 * scale, 1000 * scale]);
  });
});