type BookPageBase<Kind extends string> = {
  kind:Kind,
  headingText:string,
  chapterNo:number
}

export default BookPageBase;