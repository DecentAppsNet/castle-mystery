/* This module groups stair-part models, stair-part enums, and stair-part duplication helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import Position, { duplicatePosition } from "./Position";

export const StairPartType = {
  flight:'flight',
  landing:'landing',
  catwalk:'catwalk'
} as const;

export type StairPartType = typeof StairPartType[keyof typeof StairPartType];

export const StairLandingType = {
  directLeft:'directLeft',
  directRight:'directRight',
  midStory:'midStory',
  fullStory:'fullStory',
  terminalStory:'terminalStory'
} as const;

export type StairLandingType = typeof StairLandingType[keyof typeof StairLandingType];

type StairFlightPart = {
  type:typeof StairPartType.flight,
  startPosition:Position,
  endPosition:Position,
  z:number
};

type StairLandingPart = {
  type:typeof StairPartType.landing,
  landingType:StairLandingType,
  leftX:number,
  topY:number,
  width:number,
  height:number,
  z:number,
  depth:number
};

type StairCatwalkPart = {
  type:typeof StairPartType.catwalk,
  leftX:number,
  topY:number,
  width:number,
  height:number,
  z:number,
  depth:number
};

type StairPart = StairFlightPart | StairLandingPart | StairCatwalkPart;

export function duplicateStairPart(from:StairPart):StairPart {
  switch(from.type) {
    case StairPartType.flight:
      return {
        type:from.type,
        startPosition:duplicatePosition(from.startPosition),
        endPosition:duplicatePosition(from.endPosition),
        z:from.z
      };
    case StairPartType.landing:
    case StairPartType.catwalk:
      return { ...from };
  }
}

export default StairPart;