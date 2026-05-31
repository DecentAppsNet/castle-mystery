import Position, { duplicatePosition } from "./Position";

export enum StairPartType {
  flight = 'flight',
  landing = 'landing',
  catwalk = 'catwalk'
}

export enum StairLandingType {
  directLeft = 'directLeft',
  directRight = 'directRight',
  midStory = 'midStory',
  fullStory = 'fullStory',
  terminalStory = 'terminalStory'
}

type StairFlightPart = {
  type:StairPartType.flight,
  startPosition:Position,
  endPosition:Position,
  z:number
};

type StairLandingPart = {
  type:StairPartType.landing,
  landingType:StairLandingType,
  leftX:number,
  topY:number,
  width:number,
  height:number,
  z:number,
  depth:number
};

type StairCatwalkPart = {
  type:StairPartType.catwalk,
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