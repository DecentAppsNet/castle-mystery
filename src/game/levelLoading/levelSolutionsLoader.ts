/* This module groups solution-section parsing and generated-solution creation during level load. */

import { parseNameValueLineEntries, parseNameValueLines, parseOptions, parseSectionEntries } from "@/common/markdownUtil";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";

import Character from "../types/Character";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "../solutions/types/ClozeBlank";
import ClozePart from "../solutions/types/ClozePart";
import ClozePartType from "../solutions/types/ClozePartType";
import Solution from "../solutions/types/Solution";
import { createNormalizedEntryMap, normalizeId, normalizeOptionalId } from "../idUtil";

type SolutionPrerequisite = {
  unlockForItemId:string|null,
  unlockForSolutionId:string|null
}

function _createSolution(solutionTitle:string, title:string|null, parts:ClozePart[], prerequisite:SolutionPrerequisite):Solution {
  return {
    id:normalizeId(solutionTitle),
    title:title || solutionTitle.trim(),
    parts,
    isComplete:false,
    isLocked:Boolean(prerequisite.unlockForItemId || prerequisite.unlockForSolutionId),
    unlockForItemId:prerequisite.unlockForItemId,
    unlockForSolutionId:prerequisite.unlockForSolutionId
  };
}

function _parseBulletedLineValues(markdownText:string, name:string):string[] {
  return markdownText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith(`* ${name}=`))
    .map(line => line.slice(`* ${name}=`.length).trim())
    .filter(Boolean);
}

function _parseSolutionPrerequisite(solutionSubsection:string, solutionTitle:string):SolutionPrerequisite {
  const unlockForItemTexts = _parseBulletedLineValues(solutionSubsection, 'unlockForItem');
  const unlockForSolutionTexts = _parseBulletedLineValues(solutionSubsection, 'unlockForSolution');

  if (unlockForItemTexts.length > 1) throw new Error(`solution '${solutionTitle}' has multiple unlockForItem lines`);
  if (unlockForSolutionTexts.length > 1) throw new Error(`solution '${solutionTitle}' has multiple unlockForSolution lines`);
  if (unlockForItemTexts.length && unlockForSolutionTexts.length) throw new Error(`solution '${solutionTitle}' cannot define both unlockForItem and unlockForSolution`);

  return {
    unlockForItemId:normalizeOptionalId(unlockForItemTexts[0]),
    unlockForSolutionId:normalizeOptionalId(unlockForSolutionTexts[0])
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

function _parseSolutionCategoryText(solutionsSection:string):string {
  const lines = solutionsSection.split('\n');
  const firstSubsectionIndex = lines.findIndex(line => line.trim().startsWith('## '));
  const categoryLines = firstSubsectionIndex === -1 ? lines : lines.slice(0, firstSubsectionIndex);
  return categoryLines.join('\n');
}

function _normalizeCategoryPhrase(phrase:string):string {
  return phrase.trim().toLowerCase();
}

export function createSolutionCategoryOptionsByName(solutionsSection:string, defaultCategoryOptionsByName:Map<string, string[]> = new Map()):Map<string, string[]> {
  const authoredCategoryEntriesById = createNormalizedEntryMap(parseNameValueLineEntries(_parseSolutionCategoryText(solutionsSection)));
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
        imageUrl:clozeTemplate.slice(nextToken.startIndex + 1, nextToken.endIndex - 1).trim()
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

export function loadSolutionsFromSection(solutionsSection:string, categoryOptionsByName?:Map<string, string[]>):Solution[] {
  const section = solutionsSection || "";
  if (!section.trim()) return [];

  const resolvedCategoryOptionsByName = categoryOptionsByName || createSolutionCategoryOptionsByName(section);
  const solutionSubsectionsById = createNormalizedEntryMap(parseSectionEntries(section, 2));

  return Array.from(solutionSubsectionsById.values()).map(({ authoredName:title, value:solutionSubsection }) => {
    const nameValues = parseNameValueLines(solutionSubsection);
    const clozeTemplate = nameValues.solution || nameValues.clozeStatement || "";
    const prerequisite = _parseSolutionPrerequisite(solutionSubsection, title);

    return _createSolution(
      title,
      nameValues.title || null,
      _parseClozeTemplateToParts(clozeTemplate, resolvedCategoryOptionsByName),
      prerequisite
    );
  });
}

export function createGeneratedIdentitySolution(characters:Character[], categoryOptionsByName:Map<string, string[]>):Solution|null {
  if (!characters.length) return null;

  const parts:ClozePart[] = [];
  characters.forEach((character, characterIndex) => {
    if (characterIndex > 0) {
      parts.push({ type:ClozePartType.separator });
    }
    if (character.faceImageUrl) {
      parts.push({ type:ClozePartType.image, imageUrl:character.faceImageUrl });
    } else {
      parts.push({ type:ClozePartType.text, text:'???' });
    }
    parts.push({ type:ClozePartType.text, text:' = ' });
    parts.push(_createClozeBlankFromCorrectAnswer(character.title, categoryOptionsByName));
  });

  return {
    ..._createSolution('identities', 'Identities', parts, { unlockForItemId:null, unlockForSolutionId:null }),
    isComplete:characters.every(character => character.isTitleKnown)
  };
}
