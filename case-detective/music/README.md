# The music

The game's background music is Niccolò Paganini's 24 Caprices for solo violin, Op. 1 (written about 1802 to 1817, first printed in 1820). The composition is in the public domain.

No recording is used. `list.js` names the pieces, each `caprice-NN.js` holds the notes of one piece, and `../js/music.js` plays them with a small violin synthesizer (Web Audio API).

## Where the notes come from

- Nos. 1, 2 and 3: typeset by Andrew Buck for [the Mutopia Project](https://www.mutopiaproject.org/), shared under the [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) license. Editions: [No. 1](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=995), [No. 2](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=996), [No. 3](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1459).
- Nos. 23 and 24: typeset by Samuel Rummel for [the Mutopia Project](https://www.mutopiaproject.org/), shared under the [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/) license. Editions: [No. 23](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1999), [No. 24](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2000).

What was changed: the MIDI file of each edition was turned into a short note list (`caprice-NN.js`). Each note list is shared under the same license as the edition it comes from, and says so in its first lines. The MIDI files of Nos. 1, 2 and 3 give no tempo, so a tempo was chosen from the tempo words of the score (Andante, Moderato, Sostenuto and Presto). Each of those note lists names its tempo in its first lines.

Nos. 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21 and 22 are not in the game yet.

| Piece | Marking | Notes | Length |
| --- | --- | --- | --- |
| Caprice No. 1 in E major | Andante | 1242 | 2:13 |
| Caprice No. 2 in B minor | Moderato | 1450 | 3:34 |
| Caprice No. 3 in E minor | Sostenuto, Presto | 856 | 3:01 |
| Caprice No. 23 in E-flat major | Posato | 1632 | 3:29 |
| Caprice No. 24 in A minor | Tema con variazioni. Quasi presto | 1593 | 2:12 |
