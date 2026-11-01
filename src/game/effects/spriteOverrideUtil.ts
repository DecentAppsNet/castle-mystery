/* This file collects anatomy contributions and aggregates relative deltas without drawing or mutating inputs.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { getViewerArmPartKind } from '@/game/characterBody';
import Character from '../types/Character';
import SpriteOverride from './types/SpriteOverride';
import Effect from './types/Effect';
import CharacterAnatomyContext from './types/CharacterAnatomyContext';

type CharacterArmContext = Pick<Character, 'facingDirection'|'rootBodyPart'>;

/** Invokes each anatomy capability once with the same base context and clocks, without calling draw handlers. */
export function collectAnatomyOverrides(effects:readonly Effect[], context:CharacterAnatomyContext,
  gameTime:number, metaTime:number):SpriteOverride[] {
  return effects.flatMap(effect => effect.anatomyHandler?.(context, gameTime, metaTime) ?? []);
}

/** Adds angles around each attached pivot and translations within their declared fixed canvas frame.
 * Head reflection and logical-height projection remain consumer responsibilities, applied once to totals.
 * No matrix multiplication or intermediate geometry depends on contribution order. */
export function aggregateSpriteOverrides(overrides:readonly SpriteOverride[],
  character:CharacterArmContext):SpriteOverride[] {
  const aggregated:SpriteOverride[] = [];
  for (const override of overrides) {
    if (override.transformType === 'deferredHandDisplacement') {
      aggregated.push({ ...override });
      continue;
    }
    const next = override.transformType === 'rotate'
      && (override.spriteKind === 'viewerFrontArm' || override.spriteKind === 'viewerBackArm')
      ? { ...override, spriteKind:getViewerArmPartKind(character, override.spriteKind) } : { ...override };
    const previous = aggregated.find(entry => entry.spriteKind === next.spriteKind && entry.transformType === next.transformType);
    if (!previous) aggregated.push(next);
    else if (previous.transformType === 'rotate' && next.transformType === 'rotate') {
      previous.rotateRadians += next.rotateRadians;
    } else if (previous.transformType === 'translatePartHeight' && next.transformType === 'translatePartHeight') {
      previous.translateHeightRatio += next.translateHeightRatio;
    } else if (previous.transformType === 'translateCanvas' && next.transformType === 'translateCanvas') {
      previous.translateCanvasX += next.translateCanvasX;
      previous.translateCanvasY += next.translateCanvasY;
    }
  }
  return aggregated.sort((first, second) => first.spriteKind.localeCompare(second.spriteKind));
}