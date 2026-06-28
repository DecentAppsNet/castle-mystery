import TextureOperation from "./TextureOperation";

type Texture = Readonly<{
  operations:Readonly<TextureOperation>[]
}>;

function _duplicateTextureOperation(from:TextureOperation):TextureOperation {
  return { ...from };
}

export function duplicateTexture(from:Texture):Texture {
  return {
    operations:from.operations.map(_duplicateTextureOperation)
  };
}

export default Texture;