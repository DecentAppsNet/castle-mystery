/// <reference types="node" />

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type GenerateImageResult from '../types/GenerateImageResult.ts';

type OpenAiImageResponse = {
  readonly data?:ReadonlyArray<{
    readonly b64_json?:string,
    readonly revised_prompt?:string,
  }>,
  readonly error?:{
    readonly message?:string,
  }
}

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_EDIT_URL = 'https://api.openai.com/v1/images/edits';

function _findImageMimeType(imageFilePath:string):string {
  const fileExtension = path.extname(imageFilePath).toLowerCase();
  if (fileExtension === '.png') return 'image/png';
  if (fileExtension === '.jpg' || fileExtension === '.jpeg') return 'image/jpeg';
  if (fileExtension === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function _createEditRequestBody(promptText:string, size:string, imageFilePaths:ReadonlyArray<string>):Promise<FormData> {
  const formData = new FormData();
  formData.append('model', 'gpt-image-1.5');
  formData.append('prompt', promptText);
  formData.append('size', size);
  for (const imageFilePath of imageFilePaths) {
    const imageBytes = await readFile(imageFilePath);
    const imageBlob = new Blob([new Uint8Array(imageBytes)], { type: _findImageMimeType(imageFilePath) });
    formData.append('image[]', imageBlob, path.basename(imageFilePath));
  }
  return formData;
}

async function _describeGenerateFailure(response:Response):Promise<string> {
  try {
    const responseJson = await response.json() as OpenAiImageResponse;
    const errorMessage = responseJson.error?.message?.trim();
    if (errorMessage) return errorMessage;
  }
  catch {
  }

  return `Image generation failed with status ${response.status}.`;
}

async function _generateImageFromPrompt(promptText:string, size:string, apiKeyText:string):Promise<Response> {
  return fetch(OPENAI_IMAGE_URL, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${apiKeyText}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model:'gpt-image-1.5',
      prompt: promptText,
      size
    })
  });
}

async function _generateImageFromReferences(promptText:string, size:string, apiKeyText:string, imageFilePaths:ReadonlyArray<string>):Promise<Response> {
  return fetch(OPENAI_IMAGE_EDIT_URL, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${apiKeyText}`,
    },
    body: await _createEditRequestBody(promptText, size, imageFilePaths)
  });
}

export async function generateImageBase64(promptText:string, size:string, apiKeyText:string, imageFilePaths:ReadonlyArray<string> = []):Promise<GenerateImageResult> {
  const response = imageFilePaths.length > 0
    ? await _generateImageFromReferences(promptText, size, apiKeyText, imageFilePaths)
    : await _generateImageFromPrompt(promptText, size, apiKeyText);

  if (!response.ok) throw new Error(await _describeGenerateFailure(response));
  const responseJson = await response.json() as OpenAiImageResponse;
  const firstImage = responseJson.data?.[0];
  if (!firstImage?.b64_json) throw new Error('OpenAI did not return base64 image data.');
  return {
    imageBase64:firstImage.b64_json,
    revisedPromptText:firstImage.revised_prompt ?? null
  };
}
