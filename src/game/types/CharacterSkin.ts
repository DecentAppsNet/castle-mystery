type CharacterSkin = {
  readonly id:string, // ID of skin. It will be prefixed with character ID, e.g. `sam-drunk`, and default skin witll just be `sam`.

  // Members below describe overrides of character members with null value indicating no override.
  readonly description:string|null,
  readonly faceImageUrl:string|null
}

export function duplicateCharacterSkin(from:CharacterSkin) { 
  return {...from};
}

export const DEFAULT_SKIN_ID = 'default';

export default CharacterSkin;