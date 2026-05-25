/// <reference types="node" />

import { createInterface } from 'node:readline/promises';

import type CommandLineArgs from '../types/CommandLineArgs.ts';
import type PromptParameter from '../types/PromptParameter.ts';

const OPENAI_API_KEY_ENV_VAR_NAME = 'OPENAI_API_KEY';

function _parseFieldValues(argumentTexts:string[]):{ fieldValues:Record<string, string>, outfilePathText:string|null } {
  const fieldValues:Record<string, string> = {};
  let outfilePathText:string|null = null;
  for (const argumentText of argumentTexts) {
    const equalPos = argumentText.indexOf('=');
    if (equalPos === -1) throw new Error(`Expected field assignment like name=value, got '${argumentText}'.`);
    const fieldName = argumentText.slice(0, equalPos).trim();
    const fieldValue = argumentText.slice(equalPos + 1).trim();
    if (!fieldName) throw new Error(`Expected field name before '=' in '${argumentText}'.`);
    if (fieldName === 'outfile') {
      outfilePathText = fieldValue || null;
      continue;
    }
    fieldValues[fieldName] = fieldValue;
  }
  return { fieldValues, outfilePathText };
}

export function findCommandLineArgs():CommandLineArgs {
  const [templateName, ...fieldArgumentTexts] = process.argv.slice(2);
  if (!templateName?.trim()) throw new Error('Expected a template name, e.g. cmgen pet animal=ferret name=Barney.');
  const { fieldValues, outfilePathText } = _parseFieldValues(fieldArgumentTexts);
  return {
    templateName: templateName.trim(),
    outfilePathText,
    fieldValues,
  };
}

export function requireApiKeyText():string {
  const apiKeyText = process.env[OPENAI_API_KEY_ENV_VAR_NAME]?.trim();
  if (apiKeyText) return apiKeyText;
  throw new Error(`Missing ${OPENAI_API_KEY_ENV_VAR_NAME} environment variable.`);
}

export async function promptForMissingFieldValues(
  promptParameters:ReadonlyArray<PromptParameter>,
  fieldValues:Record<string, string>
):Promise<Record<string, string>> {
  const nextFieldValues = { ...fieldValues };
  const readlineInterface = createInterface({ input:process.stdin, output:process.stdout });

  try {
    for (const promptParameter of promptParameters) {
      const existingValue = nextFieldValues[promptParameter.name]?.trim() ?? '';
      if (existingValue.length > 0) {
        nextFieldValues[promptParameter.name] = existingValue;
        continue;
      }

      const suffixText = promptParameter.isOptional ? ' (optional, press Enter to skip)' : '';
      while (true) {
        const responseText = (await readlineInterface.question(`Enter ${promptParameter.name}${suffixText}: `)).trim();
        if (responseText.length > 0) {
          nextFieldValues[promptParameter.name] = responseText;
          break;
        }
        if (promptParameter.isOptional) {
          delete nextFieldValues[promptParameter.name];
          break;
        }
      }
    }
  }
  finally {
    readlineInterface.close();
  }

  return nextFieldValues;
}
