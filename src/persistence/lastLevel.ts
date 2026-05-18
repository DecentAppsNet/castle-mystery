import { getText, setText } from "./pathStore";

const key = '/lastLevel.txt';

export async function getLastLevelUrl():Promise<string|null> {
  return await getText(key);
}

export async function setLastLevelUrl(levelUrl:string) {
  return await setText(key, levelUrl);
}