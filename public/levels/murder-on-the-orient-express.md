# general

* title=Murder on the Orient Express
* activeCharacter=Pierre Michel
* time=19:30
* winSynopsis=Murder on the Orient Express

# map

```
112233445566778899aabbccdd..........
112233445566778899aabbccdd..........
CCCCCCCCCCCCCCCCCCCCCCCCCCRRRRRRRRRR
..........................RRRRRRRRRR
```

* 1=Compartment 1
* 2=Compartment 2
* 3=Compartment 3
* 4=Compartment 4
* 5=Compartment 5
* 6=Compartment 6
* 7=Compartment 7
* 8=Compartment 8
* 9=Compartment 9
* a=Compartment 10
* b=Compartment 11
* c=Compartment 12
* d=Compartment 13
* C=Corridor
* R=Restaurant Car

# rooms

## Compartment 1

* exits=Corridor

```
f...
....
....
...n
```

* f=Pierre's Family Photograph
* n=Pierre's Newspaper Clipping

## Compartment 2

* exits=Corridor

```
V.y.....
.w...c..
.l...p..
.g.n....
```

* V=Ratchett
* y=Ratchett's Body
* w=Pocket Watch
* c=Charred Paper Fragment
* l=Threatening Letters
* p=Ratchett's Passport
* g=Ratchett's Ledger
* n=Ratchett's Newspaper Clipping

## Compartment 3

* exits=Corridor

```
M.r...
......
.t....
.p..f.
```

* M=MacQueen
* r=MacQueen's Papers
* t=MacQueen's Typewriter
* p=MacQueen's Passport
* f=MacQueen's Framed Photograph

## Compartment 4

* exits=Corridor

```
E.v...
......
..d...
....a.
```

* E=Masterman
* v=Valet's Case
* d=Masterman's Discharge Papers
* a=Masterman's Army Photograph

## Compartment 5

* exits=Corridor

```
F.c...
......
.w..r.
....p.
```

* F=Foscarelli
* c=Foscarelli's Sample Case
* w=Foscarelli's Photograph Wallet
* r=Foscarelli's Reference Letter
* p=Foscarelli's Passport

## Compartment 6

* exits=Corridor

```
H.l...
.t....
.p..s.
....k.
```

* H=Helena
* l=Helena's Monogrammed Luggage
* t=Helena's Luggage Label
* p=Helena's Diplomatic Passport
* s=Helena's Sisters Photograph
* k=Scarlet Kimono

## Compartment 7

* exits=Corridor

```
A.p...
......
..e...
....c.
```

* A=Rudolph
* p=Rudolph's Diplomatic Passport
* e=Sealed Dispatch Envelope
* c=Diplomatic Dispatch Case

## Compartment 8

* exits=Corridor

```
D.r...
......
.l..t.
....p.
```

* D=Mary
* r=Mary's Reticule Photograph
* l=Mary's Reference Letter
* t=Mary's Ticket
* p=Mary's Passport

## Compartment 9

* exits=Corridor

```
X.r...
.s....
....g.
.l....
```

* X=Arbuthnot
* r=Arbuthnot's Regimental Papers
* s=Arbuthnot's Walking Stick
* g=Arbuthnot's Regimental Photograph
* l=Arbuthnot's Pre-War Armstrong Letters

## Compartment 10

* exits=Corridor

```
B.p...
......
.l..t.
....a.
```

* B=Hubbard
* p=Hubbard's Passport
* l=Daughter's Letters
* t=Theatre Programme
* a=Hubbard's Linda Arden Photograph

## Compartment 11

* exits=Corridor

```
G.m...
.f....
.l....
....n.
```

* G=Greta
* m=Mission Identity Papers
* f=Bible Flyleaf
* l=Pressed Flower
* n=Greta's Nurse Photograph

## Compartment 12

* exits=Corridor

```
S.r...
......
..k...
....c.
```

* S=Schmidt
* r=Schmidt's Reference Book
* k=Recipe Book
* c=Schmidt's Cook Photograph

## Compartment 13

* exits=Corridor

```
P.t...
.r....
..c...
....l.
```

* P=Princess
* t=Princess's Travelling Case
* r=Dragomiroff's Passport
* c=Princess's Correspondence
* l=Locket

## Corridor

* exits=Compartment 1|Compartment 2|Compartment 3|Compartment 4|Compartment 5|Compartment 6|Compartment 7|Compartment 8|Compartment 9|Compartment 10|Compartment 11|Compartment 12|Compartment 13|Restaurant Car

```
PE.......................V
.a.b.c.d.e.f.g.h.i.j.k.l.m
```

* P=Pierre Michel
* E=End
* V=Vestibule
* a=Outside1
* b=Outside2
* c=Outside3
* d=Outside4
* e=Outside5
* f=Outside6
* g=Outside7
* h=Outside8
* i=Outside9
* j=Outside10
* k=Outside11
* l=Outside12
* m=Outside13

## Restaurant Car

* exits=Corridor

```
.1..2..3..4.
............
.5.........S
............
```

* 1=T1
* 2=T2
* 3=T3
* 4=T4
* 5=T5
* S=SVC

# characters

## Pierre Michel

* description=A tall Frenchman in the dark-blue uniform of the Wagons-Lits conductor. Trim moustache, watchful eyes; he knows every passenger by berth number.
* items=Master Key|Conductor's Logbook
* faceImage=/sprites/jesterFace.png
* isTitleKnown=false

## Ratchett

* title=Samuel Ratchett
* description=An elderly American gentleman, thin-lipped and uneasy. He travels with an outsized chequebook and a markedly smaller list of friends.
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## MacQueen

* title=Hector MacQueen
* description=A tall young American in a worn tweed jacket, secretary to Mr Ratchett, with a silver flask he never lets out of reach.
* items=Silver Flask
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## Masterman

* title=Edward Masterman
* description=A clipped English valet in pressed black. Eyes lowered, hands always behind his back; a small glass vial sits in his waistcoat pocket.
* items=Glass Vial
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## Foscarelli

* title=Antonio Foscarelli
* description=A boisterous Italian-American car salesman; big laugh, bigger hands, never far from a cigarette.
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## Helena

* title=Countess Helena Andrenyi
* description=A pale, elegant Hungarian countess with sad dark eyes. She rarely speaks above a murmur, even when spoken to.
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

## Rudolph

* title=Count Rudolph Andrenyi
* description=A stern Hungarian diplomat whose courtly manners thaw only when his wife is in danger of being approached.
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## Mary

* title=Mary Debenham
* description=A composed young Englishwoman with the bearing of a governess. She carries a small embroidered reticule everywhere she goes.
* items=Reticule
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

## Arbuthnot

* title=Colonel Arbuthnot
* description=A weathered British officer of the Indian Army; pipe in hand, pipe-cleaners in pocket, opinions on everything from horses to politics.
* items=Pipe|Pipe Cleaner Decoy|Pipe Cleaner Real
* faceImage=/sprites/kingFace.png
* isTitleKnown=false

## Hubbard

* title=Mrs Caroline Hubbard
* description=A loud, friendly American woman with endless stories about her daughter. Her chintz sponge-bag is never far from her hand.
* items=Sponge-Bag
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

## Greta

* title=Greta Ohlsson
* description=A devout Swedish nurse with a tired smile, a small bible in one pocket and a phial of holy oil in the other.
* items=Small Bible|Holy Oil Phial
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

## Schmidt

* title=Hildegarde Schmidt
* description=The Princess's German lady's maid: calm, capable, with a sewing kit at the ready for any popped seam.
* items=Sewing Kit
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

## Princess

* title=Princess Dragomiroff
* description=An aged Russian aristocrat in heavy black silks. She walks with a silver-topped cane and tolerates very few foolish questions.
* items=Walking Cane|Russian Newspaper
* faceImage=/sprites/queenFace.png
* isTitleKnown=false

# items

## Master Key

* description=A heavy brass passkey on a worn leather lanyard. Opens every passenger compartment on the train.
* displayChar=⚷

## Conductor's Logbook

* description=Pierre Michel's small leather notebook. Entries in neat French record passenger names, berths, and the punctuality of every halt.
* displayChar=▤

## Silver Flask

* description=An engraved silver flask, dented and well-loved. Smells faintly of cognac and, beneath that, something bitter.
* displayChar=⚱

## Glass Vial

* description=A slim glass phial, half-full of a clear liquid. The stopper is wax-sealed.
* displayChar=⚗

## Reticule

* description=A small embroidered drawstring bag belonging to Mary Debenham. Inside, a creased photograph of a child labelled "Daisy".
* displayChar=⌸

## Pipe

* description=Colonel Arbuthnot's briar pipe, bowl scorched dark with use.
* displayChar=⌇

## Pipe Cleaner Decoy

* description=A single white pipe-cleaner, openly dropped during a corridor smoke break — alibi-consistent. Standard cavalry-officer issue.
* displayChar=⌁

## Pipe Cleaner Real

* description=A single white pipe-cleaner, identical to the first, found outside the victim's compartment — one too many for a man who smokes one bowl a night.
* displayChar=⌁

## Sponge-Bag

* description=Mrs Hubbard's chintz-patterned toilet bag, larger than it looks. Usually hangs from the door-handle of whichever compartment she occupies.
* displayChar=⊞

## Small Bible

* description=A pocket bible bound in worn green cloth. The ribbon marks Psalm 23.
* displayChar=✚

## Holy Oil Phial

* description=A tiny corked phial of olive oil, blessed at Uppsala for the comfort of the sick.
* displayChar=⏚

## Sewing Kit

* description=A neat tin case holding needles, threads in six shades, and a small pair of scissors.
* displayChar=✂

## Walking Cane

* description=A silver-topped ebony cane. The Princess does not, in fact, need it to walk.
* displayChar=Ⅰ

## Russian Newspaper

* description=A folded copy of "Russkiye Vedomosti" from the previous week. Heavy creases at the editorial section.
* displayChar=▦

## Pierre's Family Photograph

* description=A sepia photograph pinned inside the lid of Pierre Michel's conductor's locker. A girl of about six smiles in a pinafore; the caption beneath in faded ink reads "Susanne, 1929".
* displayChar=▢

## Pierre's Newspaper Clipping

* description=A yellowed clipping from a Paris evening paper, folded small. The headline announces the suicide of a French nursemaid wrongly accused in the Armstrong child kidnapping.
* displayChar=◫

## Ratchett's Body

* description=The body of the elderly American gentleman, lying half-twisted across the rumpled bedclothes. Twelve distinct stab wounds at varying angles, some shallow and tentative, others driven home with full force. The wrist watch is broken; the pyjamas dark with dried blood.
* displayChar=☠

## Pocket Watch

* description=A heavy gold pocket watch on a slack chain, resting near the bedside. The crystal is whole and the second hand still sweeps the dial.
* displayChar=⌚

## Charred Paper Fragment

* description=A scrap of paper recovered from the brass ashtray, blackened along three edges. A few legible words remain: "...member little Daisy Arm...".
* displayChar=◣

## Threatening Letters

* description=Two anonymous letters bound by a single rubber band, taken from the bedside drawer. Both are typed on cheap paper, the language plain and unsigned: "You did the job. Now you'll pay for it."
* displayChar=✉

## Ratchett's Passport

* description=A worn American passport in the name of Samuel Edward Ratchett, issued in New York. The photograph shows a thin-lipped older man; the visa stamps trace a meandering route across Europe.
* displayChar=⌬

## Ratchett's Ledger

* description=A small leather-bound ledger of figures and initials. Many entries are crossed through; the final page lists a sum of forty thousand dollars opposite the single word "settled".
* displayChar=▣

## Ratchett's Newspaper Clipping

* description=A folded American newspaper page, kept inside the ledger. The photograph above the fold shows the gangster Cassetti emerging from a courtroom; the caption names him as the suspect acquitted of the Armstrong kidnapping.
* displayChar=◫

## MacQueen's Papers

* description=A bundle of correspondence in Hector MacQueen's hand. The topmost letter, from his late father, recounts the District Attorney's work on the Armstrong case and his lifelong regret at the acquittal of Cassetti.
* displayChar=▤

## MacQueen's Typewriter

* description=A portable Corona typewriter in a battered case, engraved on the brass plate "H. MacQueen". The platen still holds a sheet of half-typed dictation.
* displayChar=⌨

## MacQueen's Passport

* description=An American passport in the name of Hector Willard MacQueen. The photograph shows a young man in tweeds; recent visas mark a circuit of European capitals in Mr Ratchett's service.
* displayChar=⌬

## MacQueen's Framed Photograph

* description=A small silver-framed photograph on MacQueen's bedside shelf: an older man in a high collar, hand resting on a stack of legal books. A note pasted to the back reads "Father, the Cassetti trial".
* displayChar=▢

## Valet's Case

* description=A modest leather valise of valet's effects, monogrammed in gilt "E. M.". Inside: a folded pressing-cloth, two collar studs, and an envelope of references.
* displayChar=⊟

## Masterman's Discharge Papers

* description=British Army discharge papers issued to Edward Henry Masterman, batman, listing his commanding officer as one Colonel J. Armstrong of the Royal Scots.
* displayChar=▤

## Masterman's Army Photograph

* description=A small studio photograph from the war years: Private Masterman standing one pace behind a smiling young officer in uniform. The officer is unmistakably Colonel Armstrong.
* displayChar=▢

## Foscarelli's Sample Case

* description=A salesman's heavy sample case of motor accessories, lettered along the side "A. Foscarelli — Motor Accessories". Inside, rows of gear-knobs, spark plugs, and brass fittings are pinned to felt.
* displayChar=⊟

## Foscarelli's Photograph Wallet

* description=A leather pocket-wallet of photographs, well-thumbed at the corners. Most show the household staff of a large American house: cooks, gardeners, a chauffeur in a peaked cap who is unmistakably Foscarelli, smiling beside a young woman holding a child.
* displayChar=▢

## Foscarelli's Reference Letter

* description=A folded letter tucked beneath the felt lining of the sample case, written on Armstrong-house notepaper and warmly commending "our chauffeur Antonio" to any future employer.
* displayChar=✉

## Foscarelli's Passport

* description=An American passport in the name of Antonio Foscarelli, naturalized in Chicago. The photograph catches him mid-laugh; the customs stamps tell of frequent crossings into Italy.
* displayChar=⌬

## Helena's Monogrammed Luggage

* description=A trunk of pale calf-leather, the corners brassed and the lid stamped in small gilt letters "H.A.". A second, fainter set of initials beneath has been polished almost out of sight.
* displayChar=⊟

## Helena's Luggage Label

* description=A travel label tied to the trunk's handle. The current name has been scratched out with great care, but in slanting light the older inked letters surface: "...lena Goldenb...".
* displayChar=◉

## Helena's Diplomatic Passport

* description=A Hungarian diplomatic passport in the name of Countess Helena Maria Andrenyi. The photograph shows a pale young woman; under "previous name" the entry has been heavily inked over.
* displayChar=⌬

## Helena's Sisters Photograph

* description=A small framed photograph on the vanity: two girls in summer dresses standing on a lawn, arms about each other's waists. The pencilled caption on the reverse reads "S. and H., summer 1918".
* displayChar=▢

## Scarlet Kimono

* description=A long silk kimono of brilliant scarlet, embroidered with golden dragons, hanging behind the wardrobe door. Faintly perfumed; the hem is clean but for a single dark thread caught in the stitching.
* displayChar=⚜

## Rudolph's Diplomatic Passport

* description=A Hungarian diplomatic passport in the name of Count Rudolph Andrenyi. The photograph shows a stern, clean-shaven man; the visas trace a steady circuit of European capitals.
* displayChar=⌬

## Sealed Dispatch Envelope

* description=A heavy envelope of cream paper, closed with red wax bearing the Andrenyi seal. The Count has not yet broken it; the address is in a secretarial hand.
* displayChar=✉

## Diplomatic Dispatch Case

* description=A locked diplomatic case of stiffened black leather, the lid embossed with a small coronet. Inside, a draft letter in the Count's hand opens "...my wife's late sister, whose memory still distresses her so..."
* displayChar=⊟

## Mary's Reticule Photograph

* description=A creased photograph taken from inside Miss Debenham's embroidered reticule: a small girl in a pinafore on a swing, laughing into the camera. Pencilled on the back: "Daisy, aged four".
* displayChar=▢

## Mary's Reference Letter

* description=A folded letter on personal notepaper, signed "Sonia Armstrong", warmly thanking "Miss Debenham" for her firm but loving care of "our little Daisy" and recommending her to any future household.
* displayChar=✉

## Mary's Ticket

* description=Miss Debenham's Wagons-Lits ticket from Baghdad to Calais, the passenger column completed in her own neat hand. The compartment number reads 8.
* displayChar=⎕

## Mary's Passport

* description=A British passport in the name of Mary Hermione Debenham, occupation "governess". The earliest visas are Baghdad and Aleppo; the older stamps include a brief visit to New York in the year of the Armstrong tragedy.
* displayChar=⌬

## Arbuthnot's Regimental Papers

* description=An officer's identity folio in the name of Colonel John Arbuthnot, 12th Indian Lancers. Tucked inside, a typed sheet of regimental postings notes a six-month attachment to the British Military Mission in Long Island in the year of the Armstrong kidnapping.
* displayChar=▤

## Arbuthnot's Walking Stick

* description=A polished malacca walking stick with a silver collar, engraved in close hand: "Col. J. Arbuthnot — Poona, 1922".
* displayChar=Ⅰ

## Arbuthnot's Regimental Photograph

* description=A formal regimental group photograph mounted on stiff card. Two officers stand apart from the others on the verandah, deep in conversation: Colonel Arbuthnot, younger and dark-haired, and the unmistakable figure of Colonel Armstrong.
* displayChar=▢

## Arbuthnot's Pre-War Armstrong Letters

* description=Half a dozen letters in a man's strong hand, signed simply "John A.". The earliest, dated before the war, addresses Arbuthnot as "dear old boy" and refers to "our little goddaughter" and "Sonia's last".
* displayChar=✉

## Hubbard's Passport

* description=An American passport in the name of Caroline Martha Hubbard. The photograph shows a stout, smiling woman; recent stamps trace a winter cruise through the eastern Mediterranean.
* displayChar=⌬

## Daughter's Letters

* description=A bundle of letters in a girl's clear hand, addressed to "dearest Mother" and posted from a missionary school at Smyrna. The dates and routine details read as cover correspondence: little is said of any actual daughter.
* displayChar=✉

## Theatre Programme

* description=A creased theatre programme from a New York run of "Hedda Gabler". The leading lady is named in heavy type as Linda Arden. Pencilled across the margin in a firm hand: "Sonia's wedding — Daisy bridesmaid".
* displayChar=▥

## Hubbard's Linda Arden Photograph

* description=A studio photograph in a worn leather travelling-frame: the celebrated tragedienne Linda Arden in stage costume. The caption beneath in faded ink reads "Miss Arden as Hedda, 1925". The eyes and brow are very like Mrs Hubbard's.
* displayChar=▢

## Mission Identity Papers

* description=A small folio of Swedish mission papers in the name of Greta Margareta Ohlsson, attesting to her work as a children's nurse in foreign households before her present mission posting.
* displayChar=▤

## Bible Flyleaf

* description=The flyleaf of Greta Ohlsson's small bible, inscribed in a child's careful round hand: "To dear Nurse Greta, with love from Daisy".
* displayChar=❦

## Pressed Flower

* description=A single pressed forget-me-not, brown with age, kept between the pages of Greta's bible at the verse marked. A note in a woman's hand on the facing page reads "To dear Nurse Greta, from Sonia and Daisy".
* displayChar=❀

## Greta's Nurse Photograph

* description=A small photograph kept in a leather case: Greta, younger and unsmiling, in a starched nurse's apron, holding an infant on a sunny verandah. A child of about three clings to her skirt.
* displayChar=▢

## Schmidt's Reference Book

* description=A maid's reference book, much-thumbed, in the name of Hildegarde Schmidt, "in service". The most recent entry, in the Princess Dragomiroff's own copperplate, attests to fifteen years of faithful work.
* displayChar=▣

## Recipe Book

* description=A heavy oilcloth-bound recipe book of nursery puddings and plain American cooking. The flyleaf is stamped in purple ink "Property of the Armstrong kitchen, Long Island".
* displayChar=▣

## Schmidt's Cook Photograph

* description=A photograph in cook's whites: a younger Hildegarde Schmidt standing on the kitchen step of a very large white house, flanked by other staff. A small child sits on her hip.
* displayChar=▢

## Princess's Travelling Case

* description=A travelling dressing-case of black morocco, the lid engraved in elegant script "Princess N. Dragomiroff". Inside: silver-backed brushes, a phial of lavender water, and a velvet-lined drawer that does not quite shut.
* displayChar=⊟

## Dragomiroff's Passport

* description=A Russian passport bearing the imperial double eagle, issued in the name of Princess Natalia Dragomiroff. The customs stamps are spare; the Princess does not travel often.
* displayChar=⌬

## Princess's Correspondence

* description=A folio of letters in the Princess's hand, addressed "to my dearest Linda". The most recent, never posted, speaks of "our god-daughter Sonia, and the little one we could not save".
* displayChar=✉

## Locket

* description=A small gold locket on a fine chain, laid open on the dressing-table. Inside, a curl of fair hair and an inscription in tiny script: "To my goddaughter Sonia, on her wedding day".
* displayChar=❤

# itinerary

<!--
WP4 — T1 dinner (19:30–21:00) in the Restaurant Car. All 13 characters
seat themselves by 19:30:00 via back-planned walks (ADR 001 + Orient Express conventions §7).
Pierre Michel, Edward Masterman, and Hildegarde Schmidt sit at the SVC
service tables; passengers fill T1–T5 per design §4-T1.

Privacy degradations to revisit in FU1 (POV-gated witnessing): the 19:45
Mary/Arbuthnot whisper at T2, the 20:00 Ratchett/MacQueen working
conversation at T1, and the 20:20 Andrenyi exchange at T3 are presently
audible to anyone in the room; flagged inline below.

Dosing beats (design §4-T1): MacQueen pours from his Silver Flask into
Ratchett's coffee at 20:30; Masterman doses the mineral water from his
Glass Vial. Both items stay in their owners' inventories — no item
transfer events. The drugging is inferred from the flask/vial item
descriptions when the player examines them later.
-->

19:30:00 Ratchett @ Restaurant Car.T1
19:30:00 MacQueen @ Restaurant Car.T1
19:30:00 Mary @ Restaurant Car.T2
19:30:00 Arbuthnot @ Restaurant Car.T2
19:30:00 Helena @ Restaurant Car.T3
19:30:00 Rudolph @ Restaurant Car.T3
19:30:00 Hubbard @ Restaurant Car.T4
19:30:00 Greta @ Restaurant Car.T4
19:30:00 Foscarelli @ Restaurant Car.T4
19:30:00 Princess @ Restaurant Car.T5
19:30:00 Masterman @ Restaurant Car.SVC
19:30:00 Schmidt @ Restaurant Car.SVC
19:30:00 Pierre Michel @ Restaurant Car.SVC

<!-- FU1: POV-private at T2 — Mary and Arbuthnot's whisper -->
19:45:00 Mary says "John, please — not yet."
: Arbuthnot says "It is going to be alright, Mary."
: Mary says "When it's behind us. Not before."

19:50:00 Hubbard says "My daughter — near Smyrna she lives, but you'd call it Smyrna — she said to me before I left, 'Momma, you do not talk to strangers on that train.'"
: Hubbard says "Of course I told her, 'Honey, I am the friendliest woman on God's green earth, I cannot help talking to people.' Wouldn't you say so, Mr Foscarelli?"
: Foscarelli says "Madame, you are the soul of the train."
: Hubbard says "Why, thank you. Now this morning at the station there was a man, and I tell you I did not like the look of him — he had a face like an old coin, all worn down, you know what I mean? I had to go right past him to my compartment. Right past him."

<!-- FU1: POV-private at T1 — Ratchett and MacQueen on the letters -->
20:00:00 Ratchett says "Two more this morning."
: MacQueen says "Same as before, sir?"
: Ratchett says "Worse. Whoever it is, they know my name. My real name."
: MacQueen says "We could wire ahead. The Yugoslav police —"
: Ratchett says "No police. No police, MacQueen. You hear me?"
: MacQueen says "Yes, Mr Ratchett. The letters have arrived, by the way — three more from the Belgrade post."
: Ratchett says "Show me after dinner."

20:10:00 Foscarelli @ Restaurant Car.T5
: Foscarelli says "Your Highness! Forgive the intrusion. You remind me so much of a lady I used to drive for, in America. A grand lady — like yourself."
: Princess says "Then you have a poor memory or poor taste. Sit down at your own table."
: Foscarelli says "Ha! She would have said exactly the same thing. A grand lady — but kind, underneath. I used to drive a much finer family than this one — but that, that is a long story."
: Foscarelli @ Restaurant Car.T4

20:15:00 Hubbard says "Why, honey, what's the matter?"
: Greta says "It is nothing. I am only thinking of a child I once cared for. I do this on long journeys. I am sorry."
: Hubbard says "Oh, sweetheart. Was it a long time ago?"
: Greta says "Three years."
: Hubbard says "And was she a happy child?"
: Greta says "She was a very happy child."

<!-- FU1: POV-private at T3 — Andrenyi exchange -->
20:20:00 Rudolph says "Helena, my dear, you should eat something."
: Helena says "I am not hungry."
: Rudolph says "A little of the bread, at least. For me."
: Helena says "Tomorrow. I promise. Tomorrow I will eat."

20:30:00 MacQueen says "Coffee, sir? I brought your usual cream."
: Ratchett says "Pour me another, MacQueen, would you?"
: Masterman says "Your mineral water, sir."
: Ratchett says "Masterman, the water."
: Masterman says "Thank you, sir. Anything else?"
: Ratchett says "No. Go and eat."

21:00:00 MacQueen says "Allow me, sir."
: Ratchett says "I am tired, MacQueen. Damnably tired."
: MacQueen says "It has been a long day, sir."
: Ratchett says "Help me to my compartment. And bring those letters."

<!--
WP5 — T2 settling for the night (21:05–23:30). Diners return to their
compartments via back-planned walks from the Restaurant Car (ADR 001).
Arbuthnot loiters at Corridor.Outside8 until 22:00 before retiring to
#9; Rudolph stays with Helena in #6 until 22:00 before retiring to #7.
Mary slips out at 21:40 for a brief corridor exchange during which
Arbuthnot drops the decoy pipe-cleaner. Hubbard's bell rings at 22:15
and again at 22:45; Pierre answers each from Corridor.Outside10. At
half-past ten MacQueen leaves Ratchett to sleep, Pierre locks the
vestibule (narrative only — no exit-locking mechanic; see Orient Express conventions §8),
and Schmidt knocks at #13 to read Tolstoy until 23:15. By 23:30 every
character is in their own compartment and Pierre is at Corridor.End.

Privacy degradations to revisit in FU1 (POV-gated witnessing): the
dictation at 21:05 (Ratchett/MacQueen in #2), the Andrenyi exchange in
#6 at 21:30, and the 22:25 Ratchett/MacQueen lucid moment are
presently audible to anyone in the same compartment; flagged inline
below.
-->

21:05:00 Ratchett @ Compartment 2
21:05:00 MacQueen @ Compartment 2
21:05:00 Masterman @ Compartment 4
21:05:00 Foscarelli @ Compartment 5
21:05:00 Helena @ Compartment 6
21:05:00 Rudolph @ Compartment 6
21:05:00 Mary @ Compartment 8
21:05:00 Arbuthnot @ Corridor.Outside8
21:05:00 Hubbard @ Compartment 10
21:05:00 Greta @ Compartment 11
21:05:00 Schmidt @ Compartment 12
21:05:00 Princess @ Compartment 13
21:05:00 Pierre Michel @ Corridor.End

<!-- FU1: POV-private at Compartment 2 — Ratchett dictates to MacQueen -->
21:05:30 Ratchett says "Take this down. To Whoever You Are. I have eight men in Belgrade waiting for the train."
: Ratchett says "If anything happens to me, every one of them has a name. Yours, perhaps. Stop."
: Ratchett says "The longer you delay, the more I find out. End. Send it from the next stop."
: MacQueen says "Yes, sir. Sir — about the letters — shouldn't someone sleep in here with you? With me, perhaps?"
: Ratchett says "I sleep alone. Watch the corridor. That's enough."
: MacQueen says "Yes, sir."

<!-- FU1: POV-private at Compartment 6 — Rudolph and Helena -->
21:30:00 Rudolph says "Take this. Sleep deeply. Tomorrow will be a long day."
: Helena says "I do not need it. I can manage."
: Rudolph says "Tonight you need it. Please."
: Helena says "Rudolph — you will keep your promise?"
: Rudolph says "I have given my word. To your mother and to you. It is not your hand that has to do this."
: Helena says "Thank you."

21:40:00 Mary @ Corridor.Outside8
: Arbuthnot says "Are you well?"
: Mary says "I will be when it is done."
: Arbuthnot says "Three more hours. That is all."
: Mary says "I have been waiting three years."
: Arbuthnot drops Pipe Cleaner Decoy
: Arbuthnot says "Get some sleep if you can."
: Mary says "I won't sleep."
21:45:00 Mary @ Compartment 8

22:00:00 Rudolph @ Compartment 7
22:00:00 Arbuthnot @ Compartment 9

22:15:00 Pierre Michel @ Corridor.Outside10
: Pierre Michel says "Mrs Hubbard, you rang?"
: Hubbard says "There is a terrible draught from somewhere — can you check the window? And the door — does the door lock?"
: Pierre Michel says "I will check the window, madame. The door locks from inside. Here."
: Hubbard says "And from outside?"
: Pierre Michel says "No, madame. Only from the inside. You are perfectly safe."
: Hubbard says "Well, that is a comfort. Goodnight."
: Pierre Michel says "Goodnight, madame."
: Pierre Michel @ Corridor.End

<!-- FU1: POV-private at Compartment 2 — Ratchett's last lucid moment -->
22:25:00 Ratchett says "MacQueen. The lamp. Lower it."
: Ratchett says "...watch the corridor..."
: MacQueen says "Yes, sir. Goodnight, sir."

22:30:00 MacQueen @ Compartment 3
22:30:00 Schmidt @ Compartment 13
: Schmidt says "Your Highness. I have brought the Tolstoy."
: Princess says "Read me the chapter we left."
: Schmidt says "Yes, Your Highness."
22:30:00 Pierre Michel @ Corridor.Vestibule
: Pierre Michel says "There. Locked for the night."
: Pierre Michel @ Corridor.End

22:45:00 Pierre Michel @ Corridor.Outside10
: Pierre Michel says "Madame?"
: Hubbard says "I can still feel the draught. Are you sure the window is closed?"
: Pierre Michel says "I am sure, madame. I checked it myself."
: Hubbard says "And there is no one — no one in the corridor?"
: Pierre Michel says "Only myself, madame."
: Hubbard says "Goodnight, Monsieur Michel."
: Pierre Michel says "Goodnight, madame."
: Pierre Michel @ Corridor.End

23:15:00 Schmidt @ Compartment 12

23:30:00 Pierre Michel says "Tout est calme. Bonne nuit, mesdames et messieurs."

<!--
WP6 punch-list — itinerary-driven item placements deferred from WP3:
* Lace Handkerchief — Princess Dragomiroff drops in Compartment 2 at 01:45 during T3 visit (item to be defined in WP6, Orient Express conventions slug-form e.g. "Princess's Lace Handkerchief").
* Bloody Dagger — Mrs Hubbard takes from Compartment 2 at 01:55 and conceals in her Sponge-Bag (final location Compartment 10). Item to be defined in WP6 and placed in Compartment 2 at level start so the take/hide chain works, or introduced via an itinerary drop in #2 just prior to Hubbard's visit.
* Brass Uniform Button — Pierre Michel drops in the corridor outside Compartment 2 at 00:15 during T3.
* Pipe-Cleaner Real — Colonel Arbuthnot drops in the corridor outside Compartment 2 during T3 at 01:25.
* Pocket Watch smashed state — Hector MacQueen takes/advances/drops Pocket Watch in Compartment 2 at 00:25 to leave it stopped at 01:15; description rewrite to follow.
-->

# solutions
