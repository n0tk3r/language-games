# Credits: the recorded violin

The violin notes in `violin-01.js`, `violin-02.js` and `violin-03.js` (played by `sampler.js`) are recordings from:

**TinySOL: an audio dataset of isolated musical notes**, version 6.0 (2020)
by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua Fineberg and Yan Maresz.

- Source: https://doi.org/10.5281/zenodo.3685367 (Zenodo record 3685367)
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/

TinySOL is drawn from Studio On Line (SOL), recorded at Ircam in Paris between 1996 and 1999. Its authors thank
Hugues Vinet, Greg Beller and the coordinators of the Ircam Forum for allowing its release. The dataset is provided
"as is", without warranties of any kind; see the conditions of use in the Zenodo record.

## What was changed

32 of the 284 violin notes played "ordinario" were used: G3, A#3, C#4, E4, G4, A#4, C#5, E5, G5, A#5, C#6, E6, G6,
A#6, C#7 and E7, each at two dynamics, pp and mf. From each recording:

- each recording was cut to its attack and the first seconds of its held part (1.8 to 3.5 seconds here); the rest,
  the end of the note included, was left out (the player makes its own ending);
- a loop was made in the held part, with a short crossfade written into the sound, so that a note can be held as
  long as the music asks;
- the level was evened out over the held part (by at most 6 dB) and matched between notes, to the same loudness;
- a short pulse (a sync mark) was put in the silence before each note, for timing in the browser (it is never
  played);
- each note was re-encoded as MP3 (mono, 32 kHz, LAME VBR quality 0, about 110 kbit/s) and stored in base64 inside
  the three script files.

The pitch of each note is changed a little as it plays (up to a semitone inside G3 to E7), to give the notes in
between the recordings.

The recordings used (file names in TinySOL, folder `Strings/Violin/ordinario`):

| Pitch | pp | mf |
|---|---|---|
| G3 | Vn-ord-G3-pp-4c-N.wav | Vn-ord-G3-mf-4c-N.wav |
| A#3 | Vn-ord-A#3-pp-4c-N.wav | Vn-ord-A#3-mf-4c-N.wav |
| C#4 | Vn-ord-C#4-pp-4c-N.wav | Vn-ord-C#4-mf-4c-N.wav |
| E4 | Vn-ord-E4-pp-4c-N.wav | Vn-ord-E4-mf-4c-N.wav |
| G4 | Vn-ord-G4-pp-3c-N.wav | Vn-ord-G4-mf-3c-N.wav |
| A#4 | Vn-ord-A#4-pp-3c-N.wav | Vn-ord-A#4-mf-3c-N.wav |
| C#5 | Vn-ord-C#5-pp-3c-N.wav | Vn-ord-C#5-mf-3c-T11u.wav |
| E5 | Vn-ord-E5-pp-2c-N.wav | Vn-ord-E5-mf-2c-N.wav |
| G5 | Vn-ord-G5-pp-1c-N.wav | Vn-ord-G5-mf-1c-N.wav |
| A#5 | Vn-ord-A#5-pp-1c-N.wav | Vn-ord-A#5-mf-1c-N.wav |
| C#6 | Vn-ord-C#6-pp-1c-N.wav | Vn-ord-C#6-mf-1c-N.wav |
| E6 | Vn-ord-E6-pp-1c-N.wav | Vn-ord-E6-mf-1c-N.wav |
| G6 | Vn-ord-G6-pp-1c-T12d.wav | Vn-ord-G6-mf-1c-T15d.wav |
| A#6 | Vn-ord-A#6-pp-1c-N.wav | Vn-ord-A#6-mf-1c-N.wav |
| C#7 | Vn-ord-C#7-pp-1c-T15d.wav | Vn-ord-C#7-mf-1c-T22d.wav |
| E7 | Vn-ord-E7-pp-1c-T21d.wav | Vn-ord-E7-mf-1c-T22d.wav |

## A credit line for the game

> Violin recordings: TinySOL by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua
> Fineberg and Yan Maresz (Ircam Studio On Line), https://doi.org/10.5281/zenodo.3685367, licensed under CC BY 4.0
> (https://creativecommons.org/licenses/by/4.0/). Trimmed, looped, level-matched and re-encoded for this game.
