/** A named set of valid values available to cloze conclusion blanks. */
type ClozeCategory = {
  id:string,
  authoredName:string,
  allowedValues:string[]
}

export default ClozeCategory;