import SourceLineMap from "./SourceLineMap";

/** Combined text paired with an original-source mapping for each line. */
type SourceMappedText = {
  text:string,
  sourceLineMap:SourceLineMap
};

export default SourceMappedText;