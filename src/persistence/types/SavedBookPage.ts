import SavedBookConclusion, { isValidSavedBookConclusion } from './SavedBookConclusion';

type SavedBookPage = { readonly chapterNo:number; readonly headingText:string } & (
  | { readonly kind:'blank'|'tally' }
  | { readonly kind:'bookStart'; readonly title:string; readonly subtitle:string|null; readonly author:string }
  | { readonly kind:'chapterStart'; readonly levelUrl:string; readonly title:string; readonly description:string }
  | { readonly kind:'conclusion'; readonly levelUrl:string; readonly conclusion:SavedBookConclusion }
  | { readonly kind:'chapterEnd'; readonly levelUrl:string; readonly winSynopsis:string });

export function isValidSavedBookPage(value:unknown):value is SavedBookPage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const page = value as Partial<SavedBookPage>;
  if (!Number.isInteger(page.chapterNo) || typeof page.headingText !== 'string') return false;
  if (page.kind === 'blank' || page.kind === 'tally') return true;
  if (page.kind === 'bookStart') return typeof page.title === 'string' && typeof page.author === 'string'
    && (page.subtitle === null || typeof page.subtitle === 'string');
  if (page.kind === 'chapterStart') return typeof page.levelUrl === 'string'
    && typeof page.title === 'string' && typeof page.description === 'string';
  if (page.kind === 'chapterEnd') return typeof page.levelUrl === 'string' && typeof page.winSynopsis === 'string';
  return page.kind === 'conclusion' && typeof page.levelUrl === 'string' && isValidSavedBookConclusion(page.conclusion);
}
export default SavedBookPage;