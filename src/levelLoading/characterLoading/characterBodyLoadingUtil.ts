/* This file selects default or complete raster anatomy from authored character properties.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { createDefaultCharacterBody, createRasterCharacterBody, replaceHeadImage } from '@/game/characterBody';
import BodyPart from '@/game/characterBody/types/BodyPart';
import RasterPartGeometry from '@/game/characterBody/types/RasterPartGeometry';
import Point from '@/game/types/Point';
import { getBodyImageAssetUrl } from '@/game/imageUrlUtil';
import { ErrorCollector } from '../errorCollection';

type BodyProperties = { readonly [name:string]:string|undefined };
const PART_NAMES = ['head', 'farArm', 'nearArm', 'leftLeg', 'rightLeg', 'torso'] as const;
const CHILD_NAMES = ['head', 'farArm', 'nearArm', 'leftLeg', 'rightLeg'] as const;

function _connectionProperty(kind:string):string {
  return `torso${kind[0].toUpperCase()}${kind.slice(1)}Connection`;
}

function _parsePair(values:BodyProperties, property:string, positive:boolean,
    characterId:string, errors:ErrorCollector):Point {
  const text = values[property] ?? '';
  const components = text.split(',').map(component => component.trim());
  const numbers = components.map(Number);
  if (components.length !== 2 || components.some(component => component === '')
      || numbers.some(number => !Number.isFinite(number) || (positive && number <= 0))) {
    errors.addAt(`Expected ${property} to contain exactly two ${positive ? 'positive ' : ''}finite numbers.`,
      ['characters', characterId], `* ${property}=`, text);
    return [0, 0];
  }
  return [numbers[0], numbers[1]];
}

/** Validates supplied filenames, ignores incomplete geometry, and scales only complete valid raster anatomy. */
export function loadCharacterBody(values:BodyProperties, characterId:string, errors:ErrorCollector):BodyPart {
  const imageUrls = new Map<string, string>();
  for (const kind of PART_NAMES) {
    const filename = values[`${kind}Image`]?.trim();
    if (filename) imageUrls.set(kind, getBodyImageAssetUrl(filename));
  }
  const fallback = replaceHeadImage(createDefaultCharacterBody(), imageUrls.get('head') ?? null);
  const required = [
    ...PART_NAMES.flatMap(kind => [`${kind}Image`, `${kind}Dimensions`, `${kind}Pivot`]),
    ...CHILD_NAMES.map(_connectionProperty)
  ];
  if (required.some(property => !values[property]?.trim())) return fallback;

  const originalErrorCount = errors.count;
  function _part(kind:string):RasterPartGeometry {
    const [width, height] = _parsePair(values, `${kind}Dimensions`, true, characterId, errors);
    return { imageUrl:imageUrls.get(kind)!, width, height,
      pivotPoint:_parsePair(values, `${kind}Pivot`, false, characterId, errors) };
  }
  function _connection(kind:string):Point {
    return _parsePair(values, _connectionProperty(kind), false, characterId, errors);
  }
  const definition = {
    parts:{ head:_part('head'), farArm:_part('farArm'), nearArm:_part('nearArm'),
      leftLeg:_part('leftLeg'), rightLeg:_part('rightLeg'), torso:_part('torso') },
    connections:{ head:_connection('head'), farArm:_connection('farArm'), nearArm:_connection('nearArm'),
      leftLeg:_connection('leftLeg'), rightLeg:_connection('rightLeg') }
  };
  return errors.count === originalErrorCount ? createRasterCharacterBody(definition) : fallback;
}