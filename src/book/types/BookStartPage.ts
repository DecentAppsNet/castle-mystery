import BookPageBase from './BookPageBase';

type BookStartPage = BookPageBase<'bookStart'> & {
  title:string,
  subtitle:string|null
  author:string,
}

export default BookStartPage;