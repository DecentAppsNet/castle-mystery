/* This module groups conclusion-section parsing and generated-conclusion creation during level load. */

import { MarkdownLineError, parseNameValueLineEntriesWithLines, parseOptions, parseSectionEntriesWithLines, parseUniqueNameValueLines } from "@/common/markdownUtil";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";
import { getClozeImageCandidateUrls } from "@/game/imageUrlUtil";
import { isCharacterInteractive } from "@/game/interactivityUtil";
import { findRoomByIdOrTitle } from "@/game/roomUtil";

import Character from "../game/types/Character";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "../game/conclusions/types/ClozeBlank";
import ClozePart from "../game/conclusions/types/ClozePart";
import ClozePartType from "../game/conclusions/types/ClozePartType";
import Conclusion from "../game/conclusions/types/Conclusion";
import { normalizeId } from "../game/idUtil";
import Room from "../game/types/Room";

function _resolveRevealRoomIds(revealRoomsText:string|undefined, rooms:ReadonlyArray<Room>):string[] {
  if (!revealRoomsText) return [];
  return parseOptions(revealRoomsText).map(roomRef => findRoomByIdOrTitle([...rooms], roomRef).id);
}

function _findConclusionByIdOrTitle(conclusions:ReadonlyArray<Pick<Conclusion, 'id' | 'title'>>, conclusionRef:string):Pick<Conclusion, 'id' | 'title'> {
  const conclusionId = normalizeId(conclusionRef);
  const conclusion = conclusions.find(candidate => candidate.id === conclusionId || normalizeId(candidate.title) === conclusionId) || null;
  if (!conclusion) throw new Error(`conclusion with id or title ${conclusionRef} not found`);
  return conclusion;
}

function _resolveUnlockConclusionIds(unlockConclusionsText:string|undefined, conclusions:ReadonlyArray<Pick<Conclusion, 'id' | 'title'>>):string[] {
  if (!unlockConclusionsText) return [];
  return parseOptions(unlockConclusionsText).map(conclusionRef => _findConclusionByIdOrTitle(conclusions, conclusionRef).id);
}

function _isConclusionReference(candidate:Conclusion|null):candidate is Conclusion {
  return candidate !== null;
}

function _isGeneratedIdentitiesSubsection(authoredTitle:string, clozeTemplate:string):boolean {
  return normalizeId(authoredTitle) === 'identities' && !clozeTemplate.trim();
}

function _createConclusion(conclusionTitle:string, title:string|null, parts:ClozePart[], unlockConclusionIds:string[],
  revealRoomIds:string[]):Conclusion {
  return {
    id:normalizeId(conclusionTitle),
    title:title || conclusionTitle.trim(),
    parts,
    isComplete:false,
    isLocked:false,
    unlockConclusionIds,
    revealRoomIds
  };
}


function _findNextSeparatorStartIndex(text:string, startIndex:number):number {
  return text.indexOf('---', startIndex);
}

function _findNextImageEndIndex(text:string, startIndex:number):number {
  return text.indexOf(')', startIndex + 1);
}

function _isImageToken(text:string, startIndex:number, endIndex:number):boolean {
  if (startIndex < 0 || endIndex <= startIndex + 1) return false;
  const imageUrl = text.slice(startIndex + 1, endIndex).trim();
  return imageUrl.length > 0 && !/\s/.test(imageUrl);
}

function _findNextSpecialToken(text:string, startIndex:number):{ type:'blank'|'image'|'separator', startIndex:number, endIndex:number }|null {
  const nextBlankSegment = findSquareBracketEnclosedTextSegments(text.slice(startIndex))[0] || null;
  const nextBlank = nextBlankSegment ? {
    type:'blank' as const,
    startIndex:startIndex + nextBlankSegment.startIndex,
    endIndex:startIndex + nextBlankSegment.endIndex
  } : null;
  const nextSeparatorStartIndex = _findNextSeparatorStartIndex(text, startIndex);
  const nextSeparator = nextSeparatorStartIndex >= 0 ? {
    type:'separator' as const,
    startIndex:nextSeparatorStartIndex,
    endIndex:nextSeparatorStartIndex + 3
  } : null;
  const nextImageStartIndex = text.indexOf('(', startIndex);
  const nextImageEndIndex = nextImageStartIndex >= 0 ? _findNextImageEndIndex(text, nextImageStartIndex) : -1;
  const nextImage = nextImageStartIndex >= 0 && _isImageToken(text, nextImageStartIndex, nextImageEndIndex) ? {
    type:'image' as const,
    startIndex:nextImageStartIndex,
    endIndex:nextImageEndIndex + 1
  } : null;
  return [nextBlank, nextImage, nextSeparator]
    .filter(token => token !== null)
    .sort((token1, token2) => token1!.startIndex - token2!.startIndex)[0] || null;
}

function _parseConclusionCategoryText(conclusionsSection:string):string {
  const lines = conclusionsSection.split('\n');
  const firstSubsectionIndex = lines.findIndex(line => line.trim().startsWith('## '));
  const categoryLines = firstSubsectionIndex === -1 ? lines : lines.slice(0, firstSubsectionIndex);
  return categoryLines.join('\n');
}

function _normalizeCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

function _sortGeneratedConclusionOptions(options:string[]):string[] {
  return [...options].sort((option1, option2) => option1.localeCompare(option2, undefined, { sensitivity:'base' }));
}

function _createNormalizedConclusionSubsectionEntries(conclusionsSection:string, firstLineNo:number):Array<{ authoredName:string, value:string, lineNo:number }> {
  const normalizedEntries = new Map<string, { authoredName:string, value:string, lineNo:number }>();
  parseSectionEntriesWithLines(conclusionsSection, 2, false, firstLineNo).forEach(sectionEntry => {
    const normalizedName = normalizeId(sectionEntry.name);
    const existingEntry = normalizedEntries.get(normalizedName) || null;
    if (existingEntry) throw new MarkdownLineError(sectionEntry.lineNo,
      `duplicate normalized entry '${sectionEntry.name}' conflicts with '${existingEntry.authoredName}'`);
    normalizedEntries.set(normalizedName, {
      authoredName:sectionEntry.name,
      value:sectionEntry.value,
      lineNo:sectionEntry.lineNo
    });
  });
  return Array.from(normalizedEntries.values());
}

export function createConclusionCategoryOptionsByName(conclusionsSection:string, defaultCategoryOptionsByName:Map<string, string[]> = new Map(),
  firstLineNo:number = 1):Map<string, string[]> {
  const authoredCategoryEntriesById = new Map<string, { authoredName:string, value:string }>();
  parseNameValueLineEntriesWithLines(_parseConclusionCategoryText(conclusionsSection), false, firstLineNo).forEach(categoryEntry => {
    const normalizedCategoryId = normalizeId(categoryEntry.name);
    const existingEntry = authoredCategoryEntriesById.get(normalizedCategoryId) || null;
    if (existingEntry) throw new MarkdownLineError(categoryEntry.lineNo,
      `duplicate normalized entry '${categoryEntry.name}' conflicts with '${existingEntry.authoredName}'`);
    authoredCategoryEntriesById.set(normalizedCategoryId, {
      authoredName:categoryEntry.name,
      value:categoryEntry.value
    });
  });
  const categoryOptionsByName = new Map<string, string[]>(Array.from(defaultCategoryOptionsByName.entries())
    .map(([categoryName, categoryOptions]) => [normalizeId(categoryName), [...categoryOptions]]));
  Array.from(authoredCategoryEntriesById.entries()).forEach(([categoryId, categoryEntry]) => {
    categoryOptionsByName.set(categoryId, parseOptions(categoryEntry.value));
  });
  return categoryOptionsByName;
}

function _createBlankAvailableAnswers(correctAnswers:string[], categoryOptionsByName:Map<string, string[]>):string[] {
  const availableAnswers:string[] = [];
  const normalizedCorrectAnswers = correctAnswers.map(_normalizeCategoryPhrase);

  categoryOptionsByName.forEach(categoryOptions => {
    const normalizedCategoryOptions = new Set(categoryOptions.map(_normalizeCategoryPhrase));
    if (!normalizedCorrectAnswers.every(answer => normalizedCategoryOptions.has(answer))) return;
    categoryOptions.forEach(option => {
      if (availableAnswers.includes(option)) return;
      availableAnswers.push(option);
    });
  });

  if (!availableAnswers.length) {
    correctAnswers.forEach(answer => {
      if (availableAnswers.includes(answer)) return;
      availableAnswers.push(answer);
    });
  }

  return availableAnswers;
}

function _createClozeBlankFromTemplateText(blankText:string, categoryOptionsByName:Map<string, string[]>):ClozeBlank {
  const correctAnswers = parseOptions(blankText);
  const availableAnswers = _createBlankAvailableAnswers(correctAnswers, categoryOptionsByName);
  const normalizedAvailableAnswers = availableAnswers.map(_normalizeCategoryPhrase);
  const correctAnswerIndexes = correctAnswers
    .map(correctAnswer => normalizedAvailableAnswers.indexOf(_normalizeCategoryPhrase(correctAnswer)))
    .filter((answerIndex, index, allAnswerIndexes) => answerIndex >= 0 && allAnswerIndexes.indexOf(answerIndex) === index);

  return {
    type:ClozePartType.blank,
    availableAnswers,
    correctAnswerIndexes,
    playerAnswerIndex:UNSPECIFIED_ANSWER
  };
}

function _createClozeBlankFromCorrectAnswer(correctAnswer:string, categoryOptionsByName:Map<string, string[]>):ClozeBlank {
  return _createClozeBlankFromTemplateText(correctAnswer, categoryOptionsByName);
}

function _parseClozeTemplateToParts(clozeTemplate:string, categoryOptionsByName:Map<string, string[]>):ClozePart[] {
  if (!clozeTemplate.trim()) return [];

  const parts:ClozePart[] = [];
  let currentIndex = 0;

  while (currentIndex < clozeTemplate.length) {
    const nextToken = _findNextSpecialToken(clozeTemplate, currentIndex);
    if (!nextToken) {
      const trailingText = clozeTemplate.slice(currentIndex);
      if (trailingText.length > 0) {
        parts.push({
          type:ClozePartType.text,
          text:trailingText
        });
      }
      break;
    }

    const textBeforeToken = clozeTemplate.slice(currentIndex, nextToken.startIndex);
    if (textBeforeToken.length > 0) {
      parts.push({
        type:ClozePartType.text,
        text:textBeforeToken
      });
    }

    if (nextToken.type === 'blank') {
      const blankText = clozeTemplate.slice(nextToken.startIndex + 1, nextToken.endIndex - 1);
      parts.push(_createClozeBlankFromTemplateText(blankText, categoryOptionsByName));
    } else if (nextToken.type === 'image') {
      parts.push({
        type:ClozePartType.image,
        imageUrl:getClozeImageCandidateUrls(clozeTemplate.slice(nextToken.startIndex + 1, nextToken.endIndex - 1).trim())
      });
    } else {
      parts.push({
        type:ClozePartType.separator
      });
    }

    currentIndex = nextToken.endIndex;
  }

  return parts;
}

export function loadConclusionsFromSection(conclusionsSection:string, rooms:ReadonlyArray<Room>, categoryOptionsByName?:Map<string, string[]>,
  characters:ReadonlyArray<Character> = [], firstLineNo:number = 1):Conclusion[] {
  const section = conclusionsSection || "";
  if (!section.trim()) return [];

  const resolvedCategoryOptionsByName = categoryOptionsByName || createConclusionCategoryOptionsByName(section, new Map(), firstLineNo);
  const conclusionSubsections = _createNormalizedConclusionSubsectionEntries(section, firstLineNo);

  const parsedConclusions = conclusionSubsections.map(({ authoredName:title, value:conclusionSubsection, lineNo }) => {
    const nameValues = parseUniqueNameValueLines(conclusionSubsection, `conclusion ${normalizeId(title)}`, false, lineNo + 1);
    const clozeTemplate = nameValues.conclusion || nameValues.clozeStatement || "";

    return {
      authoredTitle:title,
      displayTitle:nameValues.title || null,
      clozeTemplate,
      parts:_parseClozeTemplateToParts(clozeTemplate, resolvedCategoryOptionsByName),
      revealRoomIds:_resolveRevealRoomIds(nameValues.revealRooms, rooms),
      unlockConclusionsText:nameValues.unlockConclusions
    };
  });

  const preliminaryConclusions = parsedConclusions.map(parsedConclusion => {
    if (_isGeneratedIdentitiesSubsection(parsedConclusion.authoredTitle, parsedConclusion.clozeTemplate)) {
      return createGeneratedIdentityConclusion(characters, resolvedCategoryOptionsByName, {
        title:parsedConclusion.displayTitle,
        revealRoomIds:parsedConclusion.revealRoomIds
      });
    }

    return _createConclusion(
      parsedConclusion.authoredTitle,
      parsedConclusion.displayTitle,
      parsedConclusion.parts,
      [],
      parsedConclusion.revealRoomIds
    );
  });

  const incomingUnlockedConclusionIds = new Set<string>();
  const authoredConclusions = parsedConclusions.flatMap((parsedConclusion, index) => {
    const preliminaryConclusion = preliminaryConclusions[index];
    if (!preliminaryConclusion) return [];
    const resolvedPreliminaryConclusions:Pick<Conclusion, 'id' | 'title'>[] = preliminaryConclusions.filter(_isConclusionReference);
    const unlockConclusionIds = _resolveUnlockConclusionIds(parsedConclusion.unlockConclusionsText, resolvedPreliminaryConclusions);
    unlockConclusionIds.forEach(conclusionId => incomingUnlockedConclusionIds.add(conclusionId));

    return [{
      ...preliminaryConclusion,
      unlockConclusionIds
    }];
  });

  return authoredConclusions.map(conclusion => ({
    ...conclusion,
    isLocked:incomingUnlockedConclusionIds.has(conclusion.id)
  }));
}

export function createGeneratedIdentityConclusion(characters:ReadonlyArray<Character>, categoryOptionsByName:Map<string, string[]>,
  overrides:{ title?:string|null, unlockConclusionIds?:string[], revealRoomIds?:string[] } = {}):Conclusion|null {
  const interactiveCharactersWithUnknownTitles = characters.filter(character => isCharacterInteractive(character) && !character.isTitleKnown);
  if (!interactiveCharactersWithUnknownTitles.length) return null;
  const interactiveCharacterTitles = _sortGeneratedConclusionOptions(interactiveCharactersWithUnknownTitles.map(character => character.title));
  const identityCategoryOptionsByName = new Map(categoryOptionsByName);
  identityCategoryOptionsByName.set('characters', interactiveCharacterTitles);

  const parts:ClozePart[] = [];
  interactiveCharactersWithUnknownTitles.forEach((character, characterIndex) => {
    if (characterIndex > 0) {
      parts.push({ type:ClozePartType.separator });
    }
    if (character.faceImageUrl) {
      parts.push({ type:ClozePartType.image, imageUrl:character.faceImageUrl });
    } else {
      parts.push({ type:ClozePartType.text, text:'???' });
    }
    parts.push({ type:ClozePartType.text, text:' = ' });
    parts.push(_createClozeBlankFromCorrectAnswer(character.title, identityCategoryOptionsByName));
  });

  return {
    ..._createConclusion('identities', overrides.title ?? 'Identities', parts, overrides.unlockConclusionIds || [], overrides.revealRoomIds || []),
    isComplete:false
  };
}
