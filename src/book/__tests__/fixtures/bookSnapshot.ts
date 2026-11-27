import BookSaveState from '@/persistence/types/BookSaveState';
import SavedBookPiece from '@/persistence/types/SavedBookPiece';
import { savedBookPages } from './savedBookPages';

function _placedAnswers(pageI:number):SavedBookPiece[] {
  return [
    { kind:'answer', pageI, styleNo:0, text:'Duchess', xPercent:17, yPercent:30, placement:{ pageI, partI:1 } },
    { kind:'answer', pageI, styleNo:2, text:'Hall', xPercent:14, yPercent:44, placement:{ pageI, partI:5 } }
  ];
}

export const bookSnapshot:BookSaveState = {
  version:1, pageNo:5, levelUrls:['/levels/second.md', '/levels/first.md', '/levels/third.md'], pages:savedBookPages,
  pieceStack:[
    { kind:'note', pageI:1, styleNo:0, text:'Cover note', xPercent:-12.25, yPercent:104 },
    ..._placedAnswers(4),
    { kind:'answer', pageI:4, styleNo:0, text:'Guard', xPercent:81.25, yPercent:12, placement:null },
    ..._placedAnswers(6),
    ..._placedAnswers(12)
  ]
};