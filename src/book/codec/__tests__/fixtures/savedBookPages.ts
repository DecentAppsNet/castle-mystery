import SavedBookConclusion from '@/persistence/types/SavedBookConclusion';
import SavedBookPage from '@/persistence/types/SavedBookPage';
import fixtureText from './savedConclusion.json?raw';

const identity = JSON.parse(fixtureText) as SavedBookConclusion;

export const savedBookPages:readonly SavedBookPage[] = [
  { kind:'blank', chapterNo:0, headingText:'' },
  { kind:'bookStart', chapterNo:0, headingText:'', title:'Castle Mystery', subtitle:'A Mystery', author:'Author' },
  { kind:'blank', chapterNo:0, headingText:'' },
  { kind:'chapterStart', chapterNo:1, headingText:'', levelUrl:'/levels/first.md', title:'First', description:'First chapter' },
  { kind:'conclusion', chapterNo:1, headingText:'Identity', levelUrl:'/levels/first.md', conclusion:identity },
  { kind:'blank', chapterNo:1, headingText:'Identity' },
  { kind:'conclusion', chapterNo:1, headingText:'Motive', levelUrl:'/levels/first.md', conclusion:{ ...identity, id:'motive', title:'Motive' } },
  { kind:'blank', chapterNo:1, headingText:'Motive' },
  { kind:'tally', chapterNo:1, headingText:'Tally' },
  { kind:'chapterEnd', chapterNo:1, headingText:'End', levelUrl:'/levels/first.md', winSynopsis:'First ending' },
  { kind:'blank', chapterNo:1, headingText:'' },
  { kind:'chapterStart', chapterNo:2, headingText:'', levelUrl:'/levels/second.md', title:'Second', description:'Second chapter' },
  { kind:'conclusion', chapterNo:2, headingText:'Identity', levelUrl:'/levels/second.md', conclusion:{ ...identity, incorrectGuessCount:7 } },
  { kind:'blank', chapterNo:2, headingText:'Identity' },
  { kind:'tally', chapterNo:2, headingText:'Tally' },
  { kind:'chapterEnd', chapterNo:2, headingText:'End', levelUrl:'/levels/second.md', winSynopsis:'Second ending' },
  { kind:'blank', chapterNo:2, headingText:'' },
  { kind:'chapterStart', chapterNo:3, headingText:'', levelUrl:'/levels/third.md', title:'Third', description:'Empty chapter' },
  { kind:'tally', chapterNo:3, headingText:'Tally' },
  { kind:'chapterEnd', chapterNo:3, headingText:'End', levelUrl:'/levels/third.md', winSynopsis:'Third ending' }
];