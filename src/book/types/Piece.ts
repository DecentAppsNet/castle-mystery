type Piece = {
  styleNo:number,
  text:string,
  xPercent:number, // Left X of piece expressed as a percentage of bookRect (both pages) width.
  yPercent:number // Top Y of piece expressed as a percentage of bookRect height.
}

export default Piece;