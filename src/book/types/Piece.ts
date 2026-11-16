type Piece = {
  readonly conclusionId:string,
  styleNo:number,
  text:string,
  xPercent:number, // Center X of piece expressed as a percentage of bookRect (both pages) width.
  yPercent:number // Center Y of piece expressed as a percentage of bookRect height.
}

export default Piece;