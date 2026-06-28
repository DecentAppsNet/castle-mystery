import TextureFilterOperation from "./TextureFilterOperation";

type TextureModifier = TextureFilterOperation;

export function duplicateTextureModifier(from:TextureModifier):TextureModifier {
  return { ...from };
}

export default TextureModifier;
