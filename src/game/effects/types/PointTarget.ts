type PointTarget = Readonly<{
  kind:'direction',
  direction:'left'|'right'|'up'|'down'|'upleft'|'upright'|'downleft'|'downright'
}|{ kind:'character', characterId:string }|{ kind:'item', itemId:string }>;

export default PointTarget;