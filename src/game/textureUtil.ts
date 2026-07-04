import Texture from "./types/Texture";
import TextureFilterOperation from "./types/TextureFilterOperation";
import TextureImageOperation from "./types/TextureImageOperation";
import TextureOperation from "./types/TextureOperation";

export function isTextureImageOperation(operation:TextureOperation):operation is TextureImageOperation {
  return operation.type === 'image';
}

export function isTextureFilterOperation(operation:TextureOperation):operation is TextureFilterOperation {
  return operation.type === 'imageFilter';
}

export function findTexturePrimaryImageOperation(texture:Texture):TextureImageOperation|null {
  return texture.operations.find(isTextureImageOperation) || null;
}

export function findTextureImageUrls(texture:Texture):string[] {
  return texture.operations.filter(isTextureImageOperation).map(operation => operation.imageUrl);
}