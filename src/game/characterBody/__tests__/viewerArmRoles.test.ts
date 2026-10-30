import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '@/game/types/Character';
import { getViewerArmPartKind } from '../index';

describe('viewer arm roles', () => {
  it('resolves right-facing vector arms', () => {
    const character = { ...createDefaultCharacter(), facingDirection:'right' as const };
    expect(getViewerArmPartKind(character, 'viewerFrontArm')).toBe('nearArm');
    expect(getViewerArmPartKind(character, 'viewerBackArm')).toBe('farArm');
  });

  it('resolves left-facing vector arms without changing body identities', () => {
    const character = { ...createDefaultCharacter(), facingDirection:'left' as const };
    expect(getViewerArmPartKind(character, 'viewerFrontArm')).toBe('farArm');
    expect(getViewerArmPartKind(character, 'viewerBackArm')).toBe('nearArm');
  });

  it('retains depth roles for right-facing raster bodies', () => {
    const base = createDefaultCharacter();
    const character = { ...base, facingDirection:'right' as const,
      rootBodyPart:{ ...base.rootBodyPart, imageUrl:'/assets/bodies/torso.png' } };
    expect(getViewerArmPartKind(character, 'viewerFrontArm')).toBe('nearArm');
    expect(getViewerArmPartKind(character, 'viewerBackArm')).toBe('farArm');
  });

  it('retains depth roles for left-facing raster bodies', () => {
    const base = createDefaultCharacter();
    const character = { ...base, facingDirection:'left' as const,
      rootBodyPart:{ ...base.rootBodyPart, imageUrl:'/assets/bodies/torso.png' } };
    expect(getViewerArmPartKind(character, 'viewerFrontArm')).toBe('nearArm');
    expect(getViewerArmPartKind(character, 'viewerBackArm')).toBe('farArm');
  });
});