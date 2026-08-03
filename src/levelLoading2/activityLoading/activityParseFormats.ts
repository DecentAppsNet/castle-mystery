// TODO - move these into activity-specific modules later.

import {
  createParseFormat,
  makeIdentifier,
  makeLiteral,
  makeNumber,
  makeOptions,
  makeSequence,
  makeText,
  makeVariableLiteral,
  makeVerb,
} from "./parseFormatUtil";
import ParseFormat from "./types/ParseFormat";

export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true);
  const appearanceId = makeIdentifier('appearanceId', 'AppearanceId');
  const rootParseStep = makeSequence([characterId, appears, as, appearanceId]);
  return createParseFormat(rootParseStep);
}

export function createBecomesParseFormat():ParseFormat {
  const itemId = makeIdentifier('itemId', 'ItemId');
  const becomes = makeVerb('becomes');
  const toItemId = makeIdentifier('toItemId', 'ItemId');
  const rootParseStep = makeSequence([itemId, becomes, toItemId]);
  return createParseFormat(rootParseStep);
}

export function createDropsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const drops = makeVerb('drops');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeOptions([
    makeLiteral('at'),
    makeLiteral('on'),
    makeLiteral('onto'),
    makeLiteral('to'),
  ]);
  const targetOptions = makeOptions([
    makeIdentifier('toItemId', 'ItemId'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ]);
  const target = makeSequence([preposition, targetOptions], true);
  const rootParseStep = makeSequence([characterId, drops, itemId, target]);
  return createParseFormat(rootParseStep);
}

export function createEmitsParseFormat():ParseFormat {
  const subject = makeOptions([
    makeIdentifier('characterId', 'CharacterId', true),
    makeIdentifier('itemId', 'ItemId'),
  ], true);
  const emits = makeVerb('emits');
  const text = makeText();
  const loudly = makeVariableLiteral('isLoud', 'loudly', true);
  const rootParseStep = makeSequence([subject, emits, text, loudly]);
  return createParseFormat(rootParseStep);
}

export function createFacesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const faces = makeVerb('faces');
  const direction = makeOptions([
    makeLiteral('left'),
    makeLiteral('right'),
    makeIdentifier('toCharacterId', 'CharacterId'),
    makeIdentifier('toItemId', 'ItemId')
  ]);
  const rootParseStep = makeSequence([characterId, faces, direction]);
  return createParseFormat(rootParseStep);
}

export function createGivesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const gives = makeVerb('gives');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const to = makeLiteral('to');
  const toCharacterId = makeIdentifier('toCharacterId', 'CharacterId');
  const rootParseStep = makeSequence([characterId, gives, itemId, to, toCharacterId]);
  return createParseFormat(rootParseStep);
}

export function createHideParseFormat():ParseFormat {
  const hide = makeVerb('hide');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([hide, target]);
  return createParseFormat(rootParseStep);
}

export function createInterruptsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const interrupts = makeVerb('interrupts');
  const text = makeText();
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, interrupts, text, toSequence]);
  return createParseFormat(rootParseStep);
}

export function createKneelsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('kneels'),
  ]);
  return createParseFormat(rootParseStep);
}

export function createLaysParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('lays'),
  ]);
  return createParseFormat(rootParseStep);
}

export function createLocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const locks = makeVerb('locks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, locks, roomId]);
  return createParseFormat(rootParseStep);
}

export function createSaysParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const says = makeVerb('says');
  const text = makeText();
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, says, text, toSequence]);
  return createParseFormat(rootParseStep);
}

export function createShowParseFormat():ParseFormat {
  const show = makeVerb('show');
  const target = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ]);
  const rootParseStep = makeSequence([show, target]);
  return createParseFormat(rootParseStep);
}

export function createSitsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('sits'),
  ]);
  return createParseFormat(rootParseStep);
}

export function createStandsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('stands'),
  ]);
  return createParseFormat(rootParseStep);
}

export function createUnlocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const unlocks = makeVerb('unlocks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, unlocks, roomId]);
  return createParseFormat(rootParseStep);
}

export function createWaitsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const waits = makeVerb('waits');
  const seconds = makeNumber('seconds', true);
  const rootParseStep = makeSequence([characterId, waits, seconds]);
  return createParseFormat(rootParseStep);
}