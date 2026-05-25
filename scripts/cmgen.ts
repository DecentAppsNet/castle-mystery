/// <reference types="node" />

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { findCommandLineArgs, promptForMissingFieldValues, requireApiKeyText } from './helpers/commandLineUtil.ts';
import { generateImageBase64 } from './helpers/imageGenerationUtil.ts';
import { fillPromptTemplate, findPromptParameters, findTemplate, loadTemplates } from './helpers/templateUtil.ts';

const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const SPINNER_INTERVAL_MSECS = 120;
const LAST_GENERATED_IMAGE_FILE_PATH = path.join(import.meta.dirname, 'templateImages/lastGen.png');

function _formatTimestampForFileName(date:Date):string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function _findOutputFilePath(templateName:string, outfilePathText:string|null):string {
  if (outfilePathText) return path.resolve(process.cwd(), outfilePathText);
  const fileName = `${templateName}-${_formatTimestampForFileName(new Date())}.png`;
  return path.join(process.cwd(), fileName);
}

function _startSpinner(labelText:string):NodeJS.Timeout {
  let frameI = 0;
  process.stdout.write(`${SPINNER_FRAMES[frameI]} ${labelText}`);
  return setInterval(() => {
    frameI = (frameI + 1) % SPINNER_FRAMES.length;
    process.stdout.write(`\r${SPINNER_FRAMES[frameI]} ${labelText}`);
  }, SPINNER_INTERVAL_MSECS);
}

function _stopSpinner(timer:NodeJS.Timeout, completionText:string):void {
  clearInterval(timer);
  process.stdout.write(`\r${completionText}\n`);
}

async function _run():Promise<void> {
  const templatesByName = await loadTemplates();
  const { templateName, outfilePathText, fieldValues } = findCommandLineArgs();
  const template = findTemplate(templateName, templatesByName);
  const promptParameters = findPromptParameters(template.promptText);
  const completedFieldValues = await promptForMissingFieldValues(promptParameters, fieldValues);
  const apiKeyText = requireApiKeyText();
  const promptText = fillPromptTemplate(template.promptText, completedFieldValues);
  const outputFilePath = _findOutputFilePath(template.name, outfilePathText);
  const spinner = _startSpinner('Generating image...');

  try {
    const { imageBase64, revisedPromptText } = await generateImageBase64(promptText, template.size, apiKeyText, template.imageFilePaths);
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    await writeFile(outputFilePath, imageBuffer);
    await writeFile(LAST_GENERATED_IMAGE_FILE_PATH, imageBuffer);
    _stopSpinner(spinner, 'Done.');
    console.log(`Template: ${template.name}`);
    console.log(`Prompt: ${promptText}`);
    if (revisedPromptText) console.log(`Revised prompt: ${revisedPromptText}`);
    console.log(`Wrote image to ${outputFilePath}`);
    console.log(`Wrote image to ${LAST_GENERATED_IMAGE_FILE_PATH}`);
  }
  catch (error) {
    _stopSpinner(spinner, 'Failed.');
    throw error;
  }
}

await _run().catch((error:unknown) => {
  const errorText = error instanceof Error ? error.message : 'Unknown error.';
  console.error(errorText);
  process.exitCode = 1;
});