type CharacterSkin = {
  readonly id:string, // ID of skin. It will be prefixed with character ID, e.g. `sam-drunk`, and default skin witll just be `sam`.

  // Appearance overrides; null inherits the base description or body head image.
  readonly description:string|null,
  readonly headImageUrl:string|null
}

export function duplicateCharacterSkin(from:CharacterSkin) { 
  return {...from};
}

export default CharacterSkin;