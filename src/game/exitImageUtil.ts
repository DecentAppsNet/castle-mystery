import ExitType from './types/ExitType';

export const EXIT_IMAGE_URLS:Record<ExitType, string> = {
  [ExitType.doorway]:'/sprites/doorway.png',
  [ExitType.door]:'/sprites/door.png',
  [ExitType.lockableDoor]:'/sprites/lockableDoor.png'
};

export const BUILT_IN_EXIT_IMAGE_URLS = Object.values(EXIT_IMAGE_URLS);

export function findExitImageUrl(exitType:ExitType):string {
  return EXIT_IMAGE_URLS[exitType];
}
