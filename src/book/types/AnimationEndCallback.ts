import BookState from "./BookState";

type AnimationEndCallback = (metaTime:number, isAborted:boolean, bookState:BookState) => void;

export default AnimationEndCallback;