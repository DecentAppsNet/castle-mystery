/* This file defines piece flair profiles and selects matching borders and colors while reserving category styles.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert } from 'decent-portal';
import FlairProfile from './types/FlairProfile';

export const NOTE_PIECE_STYLE_NO = -1;
const NOTE_FLAIR_PROFILE:FlairProfile = {
  borderPolygon:[[0, 0], [0, 1]], pieceColor:'#fff', pieceSlotColor:'#fff'
};
const RESERVED_STYLE_COUNT = 3;
const FLAIR_PROFILES:ReadonlyArray<FlairProfile> = [
  { borderPolygon:[[0, 0], [1, .55], [.40, .55], [.75, .7], [0, .75], [.40, .80], [.35, 1]],
    pieceColor:'#d8ad9f', pieceSlotColor:'#c8a694' }, // Rose
  { borderPolygon:[[0, 0], [0, .3], [1, .3], [1, .7], [0, .7], [0, 1]],
    pieceColor:'#ddc181', pieceSlotColor:'#cbb477' }, // Gold
  { borderPolygon:[[0, 0], [0, .25], [1, .5], [0, .75], [0, 1]],
    pieceColor:'#b9c499', pieceSlotColor:'#aab38e' }, // Sage
  { borderPolygon:[[1, 0], [0, 1]],
    pieceColor:'#a9c5bd', pieceSlotColor:'#9bb4ac' }, // Seafoam
  { borderPolygon:[[0, 0], [0, .35], [.5, .35], [.5, .65], [1, .65], [1, 1]],
    pieceColor:'#afbed0', pieceSlotColor:'#a0adbf' }, // Blue
  { borderPolygon:[[1, 0], [0, .5], [1, 1]],
    pieceColor:'#c4b4ce', pieceSlotColor:'#b4a5bd' }, // Lavender
  { borderPolygon:[[0, 0], [1, .25], [0, .5], [1, .75], [0, 1]],
    pieceColor:'#d3aec0', pieceSlotColor:'#c2a0af' }, // Mauve
  { borderPolygon:[[0, 0], [0, .35], [1, .2], [1, .8], [0, .65], [0, 1]],
    pieceColor:'#dfb48e', pieceSlotColor:'#cda683' }, // Apricot
  { borderPolygon:[[0, 0], [1, .35], [0, .65], [1, 1]],
    pieceColor:'#c9c18c', pieceSlotColor:'#b9b182' } // Olive
];

function _styleNoToProfileI(styleNo:number):number {
  assert(Number.isInteger(styleNo) && styleNo >= 0);
  if (styleNo < RESERVED_STYLE_COUNT) return styleNo;
  return RESERVED_STYLE_COUNT + (styleNo - RESERVED_STYLE_COUNT) % (FLAIR_PROFILES.length - RESERVED_STYLE_COUNT);
}

export function getPieceFlairProfile(styleNo:number):FlairProfile {
  return styleNo === NOTE_PIECE_STYLE_NO ? NOTE_FLAIR_PROFILE : FLAIR_PROFILES[_styleNoToProfileI(styleNo)];
}