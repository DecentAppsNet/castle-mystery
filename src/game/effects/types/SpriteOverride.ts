type SpriteOverride = {
  spriteKind:'head',
  transformType:'rotate',
  rotateRadians:number
}|{
  spriteKind:'leftHandItem'|'rightHandItem',
  transformType:'translateCanvas',
  translateCanvasX:number,
  translateCanvasY:number
};

export default SpriteOverride;