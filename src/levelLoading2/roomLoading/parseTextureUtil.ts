import Room from "@/game/types/Room";
import ErrorCollector from "../errorCollection/ErrorCollector";
import Texture from "@/game/types/Texture";
import { findImageFilterId } from "@/game/imageFilters/imageFilterUtil";
import TextureImageOperation from "@/game/types/TextureImageOperation";
import TextureFilterOperation from "@/game/types/TextureFilterOperation";
import { roomHeightToLayerCount, roomWidthToColumnCount } from "@/game/roomGridUtil";
import { ROOM_DEPTH_ROW_COUNT } from "@/game/roomSpaceConstants";
import { getRoomTextureAssetUrl } from "@/game/imageUrlUtil";

type VerticalUnit = 'layers'|'rows';
type TextureFieldName = 'backWallTexture'|'floorTexture'|'stairTexture'|'doorTexture'|'rightWallTexture';
type AlphaMode = 'composite'|'punch';

function _parseTextureAlphaMode(valueText:string, roomId:string,
    textureFieldName:TextureFieldName, errors:ErrorCollector):AlphaMode|null {
  if (!valueText.length || valueText === 'composite') return 'composite';
  if (valueText === 'punch') return 'punch';
  errors.addAt(`"${valueText}" did not equal "composite" or "punch"`, ['rooms', roomId], `* ${textureFieldName}=`, valueText);
  return null;
}

function _parsePositiveTextureSpan(valueText:string, textureFieldName:string, roomId:string, 
    errors:ErrorCollector):number|null {
  const value = Number(valueText.trim());
  if (!Number.isInteger(value) || value <= 0) {
    errors.addAt(`"${valueText}" is not a positive integer.`, ['rooms', roomId], `* ${textureFieldName}=`, valueText);
    return null;
  }
  return value;
}

function _parseTextureSpan(valueText:string, stretchCount:number,
    textureFieldName:string, roomId:string, errors:ErrorCollector):number|null {
  if (valueText.trim() === '*') return stretchCount;
  return _parsePositiveTextureSpan(valueText, textureFieldName, roomId, errors);
}

function _findTextureStretchCounts(room:Room, textureFieldName:TextureFieldName):
  { horizontalCount:number, verticalCount:number } {
  switch(textureFieldName) {
    case 'backWallTexture': return {
      horizontalCount:roomWidthToColumnCount(room.rect.width),
      verticalCount:roomHeightToLayerCount(room.rect.height)
    };
    case 'floorTexture': return {
      horizontalCount:roomWidthToColumnCount(room.rect.width),
      verticalCount:ROOM_DEPTH_ROW_COUNT
    };
    case 'rightWallTexture': return {
      horizontalCount:ROOM_DEPTH_ROW_COUNT,
      verticalCount:roomHeightToLayerCount(room.rect.height)
    };
    case 'stairTexture': return {
      horizontalCount:4,
      verticalCount:4
    };
    case 'doorTexture': return {
      horizontalCount:1,
      verticalCount:2
    };
  }
}

function _addBadTextureFormatError(textureFieldName:TextureFieldName, verticalUnitLabel:VerticalUnit, errors:ErrorCollector, roomId:string) {
  const preferedSyntaxDescription = `'filename.png (columns,${verticalUnitLabel})', 'filename.png (*,*)', or 'filename.png', with any number of '| aged stone' or additional image segments such as '| overlay.png (*,* punch)'`;
  errors.addAt(`${textureFieldName} must be in the form ${preferedSyntaxDescription}.`, 
    ['rooms', roomId], `* ${textureFieldName}=`
  );
}

function _parseRoomTextureImageOperation(value:string, room:Room,
    textureFieldName:'backWallTexture'|'floorTexture'|'stairTexture'|'doorTexture'|'rightWallTexture', 
    verticalUnitLabel:'layers'|'rows', errors:ErrorCollector):TextureImageOperation|null {
  const trimmedValue = value.trim();
  const openParenIndex = trimmedValue.lastIndexOf('(');
  const closeParenIndex = trimmedValue.lastIndexOf(')');
  const stretchCounts = _findTextureStretchCounts(room, textureFieldName);
  if (openParenIndex < 0 && closeParenIndex < 0) {
    return {
      imageUrl:getRoomTextureAssetUrl(trimmedValue, `room ${textureFieldName}`),
      horizontalCount:4,
      verticalCount:4,
      type:'image',
      alphaMode:'composite'
    };
  }
  if (openParenIndex <= 0 || closeParenIndex <= openParenIndex) {
    _addBadTextureFormatError(textureFieldName, verticalUnitLabel, errors, room.id);
    return null;
  }

  const filename = trimmedValue.slice(0, openParenIndex).trim();
  const countsAndModeText = trimmedValue.slice(openParenIndex + 1, closeParenIndex).trim();
  const trailingText = trimmedValue.slice(closeParenIndex + 1).trim();
  if (!filename || !countsAndModeText || trailingText) {
    _addBadTextureFormatError(textureFieldName, verticalUnitLabel, errors, room.id);
    return null;
  }

  const lastSpaceIndex = countsAndModeText.lastIndexOf(' ');
  const countsText = lastSpaceIndex >= 0 ? countsAndModeText.slice(0, lastSpaceIndex).trim() : countsAndModeText;
  const alphaModeText = lastSpaceIndex >= 0 ? countsAndModeText.slice(lastSpaceIndex + 1).trim().toLowerCase() : '';

  const countParts = countsText.split(',');
  if (countParts.length !== 2) {
    _addBadTextureFormatError(textureFieldName, verticalUnitLabel, errors, room.id);
    return null;
  }

  const horizontalCount = _parseTextureSpan(countParts[0], stretchCounts.horizontalCount, textureFieldName, room.id, errors);
  const verticalCount = _parseTextureSpan(countParts[1], stretchCounts.verticalCount, textureFieldName, room.id, errors);
  const alphaMode = _parseTextureAlphaMode(alphaModeText, room.id, textureFieldName, errors);
  if (!horizontalCount || !verticalCount || !alphaMode) return null;
  return {
    imageUrl:getRoomTextureAssetUrl(filename, `room ${textureFieldName}`),
    horizontalCount,
    verticalCount,
    type:'image',
    alphaMode
  };
}

function _parseRoomTextureOperation(value:string, room:Room,
    textureFieldName:'backWallTexture'|'floorTexture'|'stairTexture'|'doorTexture'|'rightWallTexture', 
    verticalUnitLabel:'layers'|'rows', errors:ErrorCollector):TextureImageOperation|TextureFilterOperation|null {
  const imageFilterId = findImageFilterId(value);
  if (imageFilterId) return { type:'imageFilter', imageFilterId };
  return _parseRoomTextureImageOperation(value, room, textureFieldName, verticalUnitLabel, errors);
}

export function parseRoomTexture(value:string|undefined, room:Room,
    textureFieldName:'backWallTexture'|'floorTexture'|'stairTexture'|'doorTexture'|'rightWallTexture', 
    verticalUnitLabel:'layers'|'rows', errors:ErrorCollector):Texture|null {
  if (!value?.trim()) return null;
  const segments = value.split('|').map(segment => segment.trim());
  if (segments.some(segment => !segment)) _addBadTextureFormatError(textureFieldName, verticalUnitLabel, errors, room.id);

  const operations = segments
    .map(segment => _parseRoomTextureOperation(segment, room, textureFieldName, verticalUnitLabel, errors))
    .filter(texture => texture !== null);
  const texture:Texture = { operations }
  return texture;
}