# Credits: the recorded cello

The cello notes in `cello-01.js`, `cello-02.js` and `cello-03.js` (played by `js/sampler.js`) are recordings from:

**TinySOL: an audio dataset of isolated musical notes**, version 6.0 (2020)
by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua Fineberg and Yan Maresz.

- Source: https://doi.org/10.5281/zenodo.3685367 (Zenodo record 3685367)
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/

TinySOL is drawn from Studio On Line (SOL). SOL was recorded at Ircam in Paris between 1996 and 1999. The authors
of TinySOL thank Hugues Vinet, Greg Beller and the coordinators of the Ircam Forum for allowing its release. The
dataset is provided “as is”, without warranties of any kind. See the conditions of use in the Zenodo record.

## What was changed

28 of the 291 cello notes played “ordinario” (the usual way, with the bow and no mute) were
used, each at two dynamics, pp and mf: C2, D#2, F#2, A2, C3, D#3, F#3, A3, C4, D#4, F#4, A4, C5 and D#5.

From each recording:

- the sound was resampled from 44.1 kHz to 32 kHz;
- it was cut to its attack and the first seconds of its held part (about 1.7 to 3.2 seconds here); the rest, the
  end of the note included, was left out (the player makes its own ending);
- the slow swells and fades of the held part were evened out, by at most 6 dB;
- one note, the soft cello C2 (`Vc-ord-C2-pp-4c-N.wav`), dips by up to 10 dB early in its held part (from about
  0.25 to 0.8 seconds after it starts); that stretch was first raised to the level of the rest of the note;
- a loop was made in the held part, with a short crossfade (30 ms) written into the sound, so that a note can be
  held as long as the music asks;
- every note was matched to the same loudness (-14 LUFS over its held part);
- a short pulse (a sync mark) was put in the silence before each note, for timing in the browser (it is never
  played);
- each note was re-encoded as MP3 (mono, 32 kHz, LAME VBR quality 0, about 107 kbit/s on average) and stored in base64
  inside the three script files.

The pitch of each note is changed a little as it plays: up to a semitone, to give the notes in between the
recordings, and usually by 2 to 4 cents (31 at most), to put the note in tune.

The recordings used are listed below, by their file names in TinySOL. TinySOL numbers the strings from the highest:
on the cello, 1c is the A string, 2c the D string, 3c the G string and 4c the C string. A name with
“T” and a number (for example T17u) is a note that the TinySOL authors had already tuned by that many cents, up (u)
or down (d). None of the files used is one of the notes that TinySOL made by transposing another note (“R”).

Cello (folder `Strings/Violoncello/ordinario`):

| Pitch | String | pp | mf |
|---|---|---|---|
| C2 | C (4c) | Vc-ord-C2-pp-4c-N.wav | Vc-ord-C2-mf-4c-N.wav |
| D#2 | C (4c) | Vc-ord-D#2-pp-4c-N.wav | Vc-ord-D#2-mf-4c-N.wav |
| F#2 | C (4c) | Vc-ord-F#2-pp-4c-N.wav | Vc-ord-F#2-mf-4c-N.wav |
| A2 | G (3c) | Vc-ord-A2-pp-3c-N.wav | Vc-ord-A2-mf-3c-N.wav |
| C3 | G (3c) | Vc-ord-C3-pp-3c-N.wav | Vc-ord-C3-mf-3c-N.wav |
| D#3 | D (2c) | Vc-ord-D#3-pp-2c-N.wav | Vc-ord-D#3-mf-2c-N.wav |
| F#3 | D (2c) | Vc-ord-F#3-pp-2c-N.wav | Vc-ord-F#3-mf-2c-N.wav |
| A3 | D (2c) | Vc-ord-A3-pp-2c-N.wav | Vc-ord-A3-mf-2c-N.wav |
| C4 | A (1c) | Vc-ord-C4-pp-1c-N.wav | Vc-ord-C4-mf-1c-N.wav |
| D#4 | A (1c) | Vc-ord-D#4-pp-1c-N.wav | Vc-ord-D#4-mf-1c-N.wav |
| F#4 | A (1c) | Vc-ord-F#4-pp-1c-N.wav | Vc-ord-F#4-mf-1c-N.wav |
| A4 | A (1c) | Vc-ord-A4-pp-1c-N.wav | Vc-ord-A4-mf-1c-N.wav |
| C5 | A (1c) | Vc-ord-C5-pp-1c-N.wav | Vc-ord-C5-mf-1c-T11u.wav |
| D#5 | A (1c) | Vc-ord-D#5-pp-1c-T10d.wav | Vc-ord-D#5-mf-1c-N.wav |

## A credit line for the game

The game uses the violin, viola and cello together, so one line covers all three (it is in `../credits.html`):

> Violin, viola and cello recordings: TinySOL by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien
> Lévy, Joshua Fineberg and Yan Maresz (Ircam Studio On Line), https://doi.org/10.5281/zenodo.3685367, licensed
> under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Trimmed, looped, level-matched and re-encoded
> for this game.

## Where these facts come from

The title, version, authors, DOI, license, the place and years of the recordings, the thanks and the “as is” terms,
and the meaning of the file names: the Zenodo record 3685367 itself (its description and conditions of use), read
on 2026-11-26. The record’s list of creators shows the first author as “Carmine Emanuele” only; its description and
its conditions of use give the full name, Carmine-Emanuele Cella, which is used here (as in the violin’s credits).
The file names: the archive `TinySOL.tar.gz` of that record and its `TinySOL_metadata.csv`.
