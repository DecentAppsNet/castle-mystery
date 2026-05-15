import { parseNameValueLines, parseOptions, parseSections } from "@/common/markdownUtil";
import { findSquareBracketEnclosedTextSegments } from "@/common/regExUtil";

import Character from "./types/Character";
import ClozeBlank, { UNSPECIFIED_ANSWER } from "./solutions/types/ClozeBlank";
import ClozePart from "./solutions/types/ClozePart";
import ClozePartType from "./solutions/types/ClozePartType";
import { normalizeSolutionPhrase } from "./solutions/solutionDiscoveryUtil";
import Solution from "./solutions/types/Solution";

function _createObscuredRemainingPhrases(parts:ClozePart[]):string[] {
  const obscuredRemainingPhrases:string[] = [];

  parts.forEach(part => {
    if (part.type !== ClozePartType.blank) return;
    const blank = part as ClozeBlank;
    blank.availableAnswers.forEach(answer => {
      const normalizedPhrase = normalizeSolutionPhrase(answer);
      if (!normalizedPhrase || obscuredRemainingPhrases.includes(normalizedPhrase)) return;
      obscuredRemainingPhrases.push(normalizedPhrase);
    });
  });

  return obscuredRemainingPhrases;
}

function _createSolution(id:string, title:string, parts:ClozePart[]):Solution {
  const obscuredRemainingPhrases = _createObscuredRemainingPhrases(parts);

  return {
    id,
    title,
    parts,
    isComplete:false,
    isObscured:true,
    obscuredRemainingPhrases
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

export function createSolutionCategoryOptionsByName(solutionsSection:string, defaultCategoryOptionsByName:Map<string, string[]> = new Map()):Map<string, string[]> {
  const categoryNameValues = parseNameValueLines(_parseSolutionCategoryText(solutionsSection));
  const categoryOptionsByName = new Map(defaultCategoryOptionsByName);
  Object.entries(categoryNameValues).forEach(([categoryName, categoryValue]) => {
    categoryOptionsByName.set(categoryName, parseOptions(categoryValue));
  });
  return categoryOptionsByName;
}

function _createBlankAvailableAnswers(correctAnswers:string[], categoryOptionsByName:Map<string, string[]>):string[] {
  const availableAnswers:string[] = [];

  categoryOptionsByName.forEach(categoryOptions => {
    if (!correctAnswers.every(answer => categoryOptions.includes(answer))) return;
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
  const correctAnswerIndexes = correctAnswers
    .map(correctAnswer => availableAnswers.indexOf(correctAnswer))
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
  const solutionSubsections = parseSections(section, 2);

  return Object.entries(solutionSubsections).map(([title, solutionSubsection]) => {
    const nameValues = parseNameValueLines(solutionSubsection);
    const clozeTemplate = nameValues.solution || nameValues.clozeStatement || "";

    return _createSolution(
      title,
      title,
      _parseClozeTemplateToParts(clozeTemplate, resolvedCategoryOptionsByName)
    );
  });
}

export function createGeneratedIdentitySolution(characters:Character[], categoryOptionsByName:Map<string, string[]>):Solution|null {
  const unknownTitleCharacters = characters.filter(character => !character.isTitleKnown);
  if (!unknownTitleCharacters.length) return null;

  const parts:ClozePart[] = [];
  unknownTitleCharacters.forEach((character, characterIndex) => {
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

  return _createSolution('Identities', 'Identities', parts);
}
