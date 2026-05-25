/// <reference types="node" />

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseSections, parseUniqueNameValueLines } from '../../src/common/markdownUtil.ts';
import type PromptParameter from '../types/PromptParameter.ts';
import type Template from '../types/Template.ts';

const TEMPLATE_FILE_PATH = path.join(import.meta.dirname, '../cmgen.md');
const TEMPLATE_IMAGE_DIR_PATH = path.join(import.meta.dirname, '../templateImages');

function _findTemplateImageFilePaths(templateFields:Record<string, string>):ReadonlyArray<string> {
  const imageFieldNames = ['image1', 'image2', 'image3'];
  return imageFieldNames
    .map(imageFieldName => templateFields[imageFieldName]?.trim() || '')
    .filter(imageRef => imageRef.length > 0)
    .map(imageRef => path.join(TEMPLATE_IMAGE_DIR_PATH, imageRef));
}

function _toTemplate(name:string, templateText:string):Template {
  const templateFields = parseUniqueNameValueLines(templateText, `template '${name}'`);
  const promptText = templateFields.prompt?.trim();
  const size = templateFields.size?.trim();
  if (!promptText) throw new Error(`Template '${name}' is missing prompt.`);
  if (!size) throw new Error(`Template '${name}' is missing size.`);
  return { name, promptText, size, imageFilePaths: _findTemplateImageFilePaths(templateFields) };
}

function _parseTemplates(templateMarkdownText:string):Record<string, Template> {
  const topSections = parseSections(templateMarkdownText);
  const templatesSectionText = topSections.templates;
  if (!templatesSectionText) throw new Error(`Missing 'templates' section in ${TEMPLATE_FILE_PATH}.`);
  const templateSections = parseSections(templatesSectionText, 2);
  const templatesByName:Record<string, Template> = {};
  for (const [name, templateText] of Object.entries(templateSections)) {
    templatesByName[name] = _toTemplate(name, templateText);
  }
  return templatesByName;
}

type PromptSegmentResults = {
  renderedText:string,
  nextIndex:number,
  isSatisfied:boolean,
}

function _findPromptFieldName(promptText:string, startIndex:number):{ fieldName:string, nextIndex:number } {
  const closingBracketIndex = promptText.indexOf(']', startIndex);
  if (closingBracketIndex === -1) throw new Error("Missing closing ']' in template prompt.");
  return {
    fieldName: promptText.slice(startIndex + 1, closingBracketIndex).trim(),
    nextIndex: closingBracketIndex + 1,
  };
}

function _collectPromptParameters(
  promptText:string,
  startIndex:number,
  terminator:string|null,
  isOptional:boolean,
  parametersByName:Record<string, PromptParameter>,
  orderedParameterNames:string[]
):number {
  let index = startIndex;

  while (index < promptText.length) {
    const char = promptText[index];
    if (terminator && char === terminator) return index + 1;
    if (char === '{') {
      index = _collectPromptParameters(promptText, index + 1, '}', true, parametersByName, orderedParameterNames);
      continue;
    }
    if (char === '[') {
      const { fieldName, nextIndex } = _findPromptFieldName(promptText, index);
      const existingParameter = parametersByName[fieldName];
      if (existingParameter) {
        existingParameter.isOptional = existingParameter.isOptional && isOptional;
      }
      else {
        parametersByName[fieldName] = { name:fieldName, isOptional };
        orderedParameterNames.push(fieldName);
      }
      index = nextIndex;
      continue;
    }
    if (char === '}') throw new Error("Unexpected closing '}' in template prompt.");
    ++index;
  }

  if (terminator) throw new Error(`Missing closing '${terminator}' in template prompt.`);
  return index;
}

function _findRequiredFieldValue(promptText:string, startIndex:number, fieldValues:Record<string, string>, isOptional:boolean):PromptSegmentResults {
  const { fieldName, nextIndex } = _findPromptFieldName(promptText, startIndex);
  const fieldValue = fieldValues[fieldName];
  if (fieldValue === undefined) {
    if (!isOptional) throw new Error(`Missing template field '${fieldName}'.`);
    return { renderedText:'', nextIndex, isSatisfied:false };
  }

  return { renderedText: fieldValue, nextIndex, isSatisfied:true };
}

function _renderPromptSegment(promptText:string, startIndex:number, fieldValues:Record<string, string>, terminator:string|null, isOptional:boolean):PromptSegmentResults {
  let renderedText = '';
  let isSatisfied = true;
  let index = startIndex;

  while (index < promptText.length) {
    const char = promptText[index];
    if (terminator && char === terminator) {
      return { renderedText: isSatisfied ? renderedText : '', nextIndex: index + 1, isSatisfied };
    }
    if (char === '{') {
      const nestedResults = _renderPromptSegment(promptText, index + 1, fieldValues, '}', true);
      renderedText += nestedResults.renderedText;
      index = nestedResults.nextIndex;
      continue;
    }
    if (char === '[') {
      const fieldResults = _findRequiredFieldValue(promptText, index, fieldValues, isOptional);
      renderedText += fieldResults.renderedText;
      isSatisfied = isSatisfied && fieldResults.isSatisfied;
      index = fieldResults.nextIndex;
      continue;
    }
    if (char === '}') throw new Error("Unexpected closing '}' in template prompt.");

    renderedText += char;
    ++index;
  }

  if (terminator) throw new Error(`Missing closing '${terminator}' in template prompt.`);
  return { renderedText, nextIndex:index, isSatisfied };
}

export function fillPromptTemplate(promptText:string, fieldValues:Record<string, string>):string {
  return _renderPromptSegment(promptText, 0, fieldValues, null, false).renderedText;
}

export function findPromptParameters(promptText:string):ReadonlyArray<PromptParameter> {
  const parametersByName:Record<string, PromptParameter> = {};
  const orderedParameterNames:string[] = [];
  _collectPromptParameters(promptText, 0, null, false, parametersByName, orderedParameterNames);
  return orderedParameterNames.map(parameterName => parametersByName[parameterName]);
}

export function findTemplate(templateName:string, templatesByName:Record<string, Template>):Template {
  const template = templatesByName[templateName];
  if (template) return template;
  throw new Error(`Unknown template '${templateName}'.`);
}

export async function loadTemplates():Promise<Record<string, Template>> {
  return _parseTemplates(await readFile(TEMPLATE_FILE_PATH, 'utf8'));
}
