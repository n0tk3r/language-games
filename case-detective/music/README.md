# The music

The game’s background music is Niccolò Paganini’s 24 Caprices for solo violin, Op. 1 (written about 1802 to 1817, first printed in 1820). The composition is in the public domain.

`list.js` names what plays, each `caprice-NN.js` holds the notes of one piece, and `../js/music.js` plays them (Web Audio API) with recordings of a real violin: `../js/sampler.js` plays the notes of `violin/violin-01.js` to `violin-03.js`. Until those have come in, and for plucked notes, a small violin synthesizer in `../js/music.js` plays. In the background you hear slow passages of the caprices, played a little slower than written, and when the Inspector takes out his violin, a fast caprice plays.

The three violin files (1.5 MB together, the low register first) are fetched one after the other with script tags when the music first starts (after the first tap with the music on); before that, and on a page with the music switched off, nothing of them is fetched. The first note does not wait for them.

## What plays

`list.js` holds two lists, written by hand (`tools/build-all.js` writes a plain list of whole pieces: after a rebuild of this folder, bring the two lists back). Between them they play 20 of the 23 caprices in the game.

The calm list is the background. Its passages were chosen by how they sound at the speed they are played: a slow melody (at most four notes a second in any five seconds, as played, and no runs of fast notes; an even two-note tremolo under the melody, as in No. 6, counts as one held sound), few bow strokes and accents, and a quiet level. Each is cut out where a phrase ends. They play one after another, softer than written, with a darker tone and a gentler bow, and fade in and out over a second and a half where they are cut out of their piece. The list begins with the slowest and gentlest passages; the livelier ones come in its second half. It holds 17 passages of 12 caprices and plays about 20 and a half minutes of music (20:31; about 21 minutes with the pauses between passages) before it begins again.

| Passage | Bars | Seconds, as written | Played at | Length | Why |
| --- | --- | --- | --- | --- | --- |
| Caprice No. 6, the opening (Lento) | 1 to 18, once (the score repeats them) | 0 to 81 | 0.75, level 0.5 | 1:48 | The gentlest passage of all, so it comes first: a melody of about one note a second, the slowest of the list, over a soft, even, slurred tremolo, with hardly an accent |
| Caprice No. 3, the opening (Sostenuto) | 1 to 24, up to the Presto | 0 to 82.3 | 0.8 | 1:43 | A slow song in octaves, under one note a second |
| Caprice No. 4, the close of the first part (Maestoso) | 50 to 58 (the first time) | 130.7 to 154.7 | 0.75 | 0:32 | After the fast bars 33 to 49: a few slow chords, then a soft close, about one note a second |
| Caprice No. 20, the opening (Allegretto) | 1 to 24, up to the Minore | 0 to 48 | 0.75 | 1:04 | A tune over a held D, under 1.5 notes a second |
| Caprice No. 6, the second part (Lento) | 19 to 38, up to the return of the theme | 162 to 252 | 0.8, level 0.5 | 1:53 | The same soft tremolo under a melody of about one note a second, dying away at the end (smorzando) |
| Caprice No. 15, the opening (Posato) | the upbeat and 1 to 7, and the octaves on the first two beats of 8 (before the fast arpeggios) | 0 to 24 | 0.75 | 0:32 | A slow melody in octaves, mostly soft, 1.4 notes a second |
| Caprice No. 11, the opening (Andante) | 1 to 28, up to the Presto | 0 to 84.1 | 0.8 | 1:45 | A song in double stops, 1.7 notes a second |
| Caprice No. 7, the opening (Posato) | the upbeat and 1 to 15, and the chord on the first beat of 16 (before the run into the fast part) | 0 to 47.75 | 0.8 | 1:00 | A slow, singing line, 1.4 notes a second |
| Caprice No. 6, the close (Lento) | 39 to 52, to the end | 252 to 314.2 | 0.8, level 0.5 | 1:18 | The theme an octave higher over the tremolo, then the end, dying away (morendo); about one note a second |
| Caprice No. 4, the second part (Maestoso) | 63 to 98 | 320 to 416 | 0.85 | 1:53 | Slow chords and a singing line, 1.7 notes a second |
| Caprice No. 22, the opening (Marcato) | 1 to 24, up to the Minore | 0 to 48 | 0.8 | 1:00 | A stately tune, mostly soft, 1.8 notes a second |
| Caprice No. 11, the close (Andante) | 93 to 105, to the end (Tempo I: the Andante again) | 164.9 to 202.7 | 0.8 | 0:47 | The Andante comes back after the Presto and ends the piece, 1.5 notes a second |
| Caprice No. 4, the opening (Maestoso) | 1 to 32 | 0 to 85.3 | 0.8 | 1:47 | The stately opening, about two notes a second |
| Caprice No. 18, the opening (Corrente) | 1 to 16, up to the Allegro | 0 to 26.2 | 0.75 | 0:35 | A dance played all on the low G string, dark and even, 2.5 notes a second |
| Caprice No. 13, the opening (Allegro) | the upbeat and 1 to 16, with both repeats, up to the Minore | 0 to 48 | 0.75 | 1:04 | Sweet (dolce) thirds, 2.6 notes a second |
| Caprice No. 14, the opening (Moderato) | 1 to 8 with the repeat, 9 to 18, and the chord on the first beat of 19 | 0 to 35 | 0.75 | 0:47 | A march in chords, slowed down and played softly: 2.6 notes a second and not one fast note |
| Caprice No. 9, the opening (Allegretto) | the upbeat and 1 to 36 | 0 to 48 | 0.75 | 1:04 | The flute and horn calls, the liveliest passage of the list (about three notes a second), so it comes last |

The show list plays while the Inspector plays his violin: brilliant fast caprices, and the fast parts of others, at the written tempo and in the full tone, one after another, a new one each time he takes the violin out. Every one of them makes at least six notes a second.

| Piece | Bars | Seconds, as written | Length | Why |
| --- | --- | --- | --- | --- |
| Caprice No. 24 in A minor (Tema con variazioni. Quasi presto) | all | 0 to 132.1 | 2:12 | The theme and its variations, about ten notes a second |
| Caprice No. 5 in A minor (Agitato) | all | 0 to 138.3 | 2:18 | Runs and arpeggios over the whole violin, 11.4 notes a second |
| Caprice No. 16 in G minor (Presto) | all | 0 to 76.6 | 1:17 | 9.1 notes a second from start to end |
| Caprice No. 1 in E major (Andante) | all | 0 to 133.0 | 2:13 | Arpeggios bounced across all four strings, 8.2 notes a second |
| Caprice No. 3, the middle part (Presto) | 25 to 128, and the octave it lands on at the start of 129 | 82.3 to 149 | 1:07 | Running sixteenth notes, 9.2 a second |
| Caprice No. 23, the middle part (Minore) | 33 to 68, and the octave it lands on at the start of 69 | 67.3 to 143.4 | 1:16 | Wide leaps across the strings, 11.4 notes a second |
| Caprice No. 10 in G minor (Vivace) | all | 0 to 182.6 | 3:03 | Hammered notes (martellato), 6.5 a second |
| Caprice No. 11, the middle part (Presto) | 29 to 92, and the chord it lands on at the start of 93 | 84.1 to 165.9 | 1:22 | 7.7 notes a second, between the two calm Andante passages of the background |
| Caprice No. 22, the middle part (Minore) | 25 to 50, with its repeats | 48 to 129.8 | 1:22 | Fast string crossings, 7.2 notes a second |
| Caprice No. 2 in B minor (Moderato) | all | 0 to 213.6 | 3:34 | String crossings from start to end, 6.4 notes a second |
| Caprice No. 13, the middle part (Minore) | the upbeat and 17 to 40, with their repeats | 48 to 114.5 | 1:06 | 7.8 notes a second |
| Caprice No. 9, the middle part (Allegretto) | 54 to 94, up to the return of the flute call | 71 to 125.3 | 0:54 | Calls in octaves and fast broken chords, 6.1 notes a second |
| Caprice No. 18, the middle part (Allegro) | the upbeat and 17 to 48, with the repeat of its Minore, up to the da capo | 26.2 to 104.7 | 1:19 | Fast scales in thirds, 6.3 notes a second |
| Caprice No. 20, the middle part (Minore) | 25 to 57, with the repeat of 25 to 32 | 48 to 115.1 | 1:07 | 6.4 notes a second |
| Caprice No. 12, the first part (Allegro) | 1 to 26, once (the score repeats them) | 0 to 62.4 | 1:02 | Wide slurred leaps, 6.4 notes a second (the whole piece with its repeats lasts 5:29) |

The seconds are those of `../js/music.js`, which begins a piece a moment later when its first chord is rolled (No. 11: 0.087 s), so `list.js` gives No. 11's Andante the end 84.087 and its Presto the start 84.087.

Three caprices are left out of both lists. No. 8 (Maestoso): after four slow bars it moves in even running notes, 4.6 a second at their busiest even at three quarters of the tempo (the calm list allows four), and its calm stretches last 28 seconds at most; its quickest part (bars 37 to 46) is soft and lasts only 27 seconds, at six notes a second, the least the show list takes. No. 17 (Sostenuto, Andante): its slow parts are broken by runs of more than a dozen quick notes, and its fast parts make fewer than six notes a second (5.8). No. 19 (Lento, Allegro assai): the Lento is only four bars long, the Minore is a little too busy for the calm list (4.2 notes a second in its busiest five seconds, at three quarters of the tempo), and the Allegro assai makes fewer than six notes a second (5.6). No. 21 is not in the game yet (see below).

Some caprices are in one list only. Nos. 1, 2, 5, 10, 16 and 24 are fast from start to end. No. 12 opens softly, but with a running figure of about five notes a second even at three quarters of the tempo. No. 23's slow theme turns into quick runs after eight bars, and its calm stretches last under half a minute. Nos. 6 and 14 have no fast part, and the fast parts of Nos. 4, 7 and 15 make fewer than six notes a second: these five play in the background only.

## Where the notes come from

- Nos. 1, 2 and 3: typeset by Andrew Buck for [the Mutopia Project](https://www.mutopiaproject.org/), shared under the [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) license. Editions: [No. 1](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=995), [No. 2](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=996), [No. 3](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1459).
- Nos. 4 to 20 and 22: typeset by [Musemeister](https://musescore.com/musemeister) on [MuseScore](https://musescore.com/) and released into the public domain ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)), taken from [PDMX](https://doi.org/10.5281/zenodo.14648209) (“PDMX: A Large-Scale Public Domain MusicXML Dataset for Symbolic Music Processing,” by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick, 2025), which is shared under the [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) license (CC BY 4.0). Scores: [No. 4](https://musescore.com/user/13502736/scores/5362196), [No. 5](https://musescore.com/user/13502736/scores/5370204), [No. 6](https://musescore.com/user/13502736/scores/5386330), [No. 7](https://musescore.com/user/13502736/scores/5395855), [No. 8](https://musescore.com/user/13502736/scores/5407620), [No. 9](https://musescore.com/user/13502736/scores/5421226), [No. 10](https://musescore.com/user/13502736/scores/5433376), [No. 11](https://musescore.com/user/13502736/scores/5446995), [No. 12](https://musescore.com/user/13502736/scores/5458520), [No. 13](https://musescore.com/user/13502736/scores/5467738), [No. 14](https://musescore.com/user/13502736/scores/5476942), [No. 15](https://musescore.com/user/13502736/scores/5486446), [No. 16](https://musescore.com/user/13502736/scores/5502689), [No. 17](https://musescore.com/user/13502736/scores/5514851), [No. 18](https://musescore.com/user/13502736/scores/5524471), [No. 19](https://musescore.com/user/13502736/scores/5533483), [No. 20](https://musescore.com/user/13502736/scores/5542792), [No. 22](https://musescore.com/user/13502736/scores/5562448).
- Nos. 23 and 24: typeset by Samuel Rummel for [the Mutopia Project](https://www.mutopiaproject.org/), shared under the [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/) license. Editions: [No. 23](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1999), [No. 24](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2000).

What was changed: the MIDI file (Nos. 1, 2, 3, 23 and 24) or the MusicXML file (Nos. 4 to 20 and 22) of each edition was turned into a short note list (`caprice-NN.js`). Each note list is shared on the same terms as the edition it comes from (under the same license, or in the public domain, CC0 1.0, when the edition is), and says so in its first lines. The MIDI files of Nos. 1, 2 and 3 give no tempo, so a tempo was chosen from the tempo words of the score (Andante, Moderato, Sostenuto and Presto). The tempo of No. 19 was changed by the table of sources: its MusicXML file plays the return of the Allegro assai theme (the second ending, from measure 42) at the Minore’s 80 quarter notes a minute, about half the speed of the same music at measure 5, so there it gets the Allegro assai’s 150 again; the rest keeps the file’s tempo (Lento 70, Allegro assai 150, Minore 80). Each of those note lists names its tempo in its first lines.

No. 21 is not in the game yet.

| Piece | Marking | Notes | Length |
| --- | --- | --- | --- |
| Caprice No. 1 in E major | Andante | 1242 | 2:13 |
| Caprice No. 2 in B minor | Moderato | 1450 | 3:34 |
| Caprice No. 3 in E minor | Sostenuto, Presto | 856 | 3:01 |
| Caprice No. 4 in C minor | Maestoso | 2766 | 8:04 |
| Caprice No. 5 in A minor | Agitato | 1582 | 2:18 |
| Caprice No. 6 in G minor | Lento | 5373 | 5:14 |
| Caprice No. 7 in A minor | Posato | 2544 | 7:28 |
| Caprice No. 8 in E-flat major | Maestoso | 2450 | 5:56 |
| Caprice No. 9 in E major | Allegretto | 1091 | 2:28 |
| Caprice No. 10 in G minor | Vivace | 1286 | 3:03 |
| Caprice No. 11 in C major | Andante, Presto | 1101 | 3:23 |
| Caprice No. 12 in A-flat major | Allegro | 2158 | 5:29 |
| Caprice No. 13 in B-flat major | Allegro | 1050 | 2:18 |
| Caprice No. 14 in E-flat major | Moderato | 944 | 1:59 |
| Caprice No. 15 in E minor | Posato | 960 | 2:45 |
| Caprice No. 16 in G minor | Presto | 703 | 1:17 |
| Caprice No. 17 in E-flat major | Sostenuto, Andante | 1466 | 3:34 |
| Caprice No. 18 in C major | Corrente, Allegro | 1069 | 2:10 |
| Caprice No. 19 in E-flat major | Lento, Allegro assai | 1101 | 3:14 |
| Caprice No. 20 in D major | Allegretto | 1064 | 3:24 |
| Caprice No. 22 in F major | Marcato | 1037 | 2:57 |
| Caprice No. 23 in E-flat major | Posato | 1632 | 3:29 |
| Caprice No. 24 in A minor | Tema con variazioni. Quasi presto | 1593 | 2:12 |

## Where the violin comes from

Violin recordings: TinySOL (“TinySOL: an audio dataset of isolated musical notes,” version 6.0, 2020) by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua Fineberg and Yan Maresz (Ircam Studio On Line), [https://doi.org/10.5281/zenodo.3685367](https://doi.org/10.5281/zenodo.3685367) (Zenodo), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). What was changed: 32 notes (G3 to E7 every three semitones, pp and mf) were trimmed, looped, level-matched and re-encoded as MP3 in base64 for this game (`violin/violin-01.js` to `violin-03.js`); the game moves each by up to a semitone inside that range to play the notes in between. Details and the list of the recordings used: `violin/CREDITS.md`.
