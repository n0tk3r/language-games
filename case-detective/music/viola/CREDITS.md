# Credits: the recorded viola

The viola notes in `viola-01.js` and `viola-02.js` (played by `js/sampler.js`) are recordings from:

**TinySOL: an audio dataset of isolated musical notes**, version 6.0 (2020)
by Carmine-Emanuele Cella, Daniele Ghisi, Vincent Lostanlen, Fabien Lévy, Joshua Fineberg and Yan Maresz.

- Source: https://doi.org/10.5281/zenodo.3685367 (Zenodo record 3685367)
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/

TinySOL is drawn from Studio On Line (SOL). SOL was recorded at Ircam in Paris between 1996 and 1999. The authors
of TinySOL thank Hugues Vinet, Greg Beller and the coordinators of the Ircam Forum for allowing its release. The
dataset is provided “as is”, without warranties of any kind. See the conditions of use in the Zenodo record.

## What was changed

22 of the 309 viola notes played “ordinario” (the usual way, with the bow and no mute) were
used, each at two dynamics, pp and mf: C3, D#3, F#3, A3, C4, D#4, F#4, A4, C5, D#5 and F#5.

From each recording:

- the sound was resampled from 44.1 kHz to 32 kHz;
- it was cut to its attack and the first seconds of its held part (about 1.8 to 3.4 seconds here); the rest, the
  end of the note included, was left out (the player makes its own ending);
- the slow swells and fades of the held part were evened out, by at most 6 dB;
- a loop was made in the held part, with a short crossfade (30 ms) written into the sound, so that a note can be
  held as long as the music asks;
- every note was matched to the same loudness (-14 LUFS over its held part);
- a short pulse (a sync mark) was put in the silence before each note, for timing in the browser (it is never
  played);
- each note was re-encoded as MP3 (mono, 32 kHz, LAME VBR quality 0, about 109 kbit/s on average) and stored in base64
  inside the two script files.

The pitch of each note is changed a little as it plays: up to a semitone, to give the notes in between the
recordings, and usually by 2 to 4 cents (11 at most), to put the note in tune.

The recordings used are listed below, by their file names in TinySOL. TinySOL numbers the strings from the highest:
on the viola, 1c is the A string, 2c the D string, 3c the G string and 4c the C string. A name with
“T” and a number (for example T17u) is a note that the TinySOL authors had already tuned by that many cents, up (u)
or down (d). None of the files used is one of the notes that TinySOL made by transposing another note (“R”).

Viola (folder `Strings/Viola/ordinario`):

| Pitch | String | pp | mf |
|---|---|---|---|
| C3 | C (4c) | Va-ord-C3-pp-4c-N.wav | Va-ord-C3-mf-4c-N.wav |
| D#3 | C (4c) | Va-ord-D#3-pp-4c-T17u.wav | Va-ord-D#3-mf-4c-T22u.wav |
| F#3 | C (4c) | Va-ord-F#3-pp-4c-T11u.wav | Va-ord-F#3-mf-4c-T12u.wav |
| A3 | C (4c) | Va-ord-A3-pp-4c-T14u.wav | Va-ord-A3-mf-4c-T10u.wav |
| C4 | G (3c) | Va-ord-C4-pp-3c-N.wav | Va-ord-C4-mf-3c-N.wav |
| D#4 | D (2c) | Va-ord-D#4-pp-2c-N.wav | Va-ord-D#4-mf-2c-N.wav |
| F#4 | D (2c) | Va-ord-F#4-pp-2c-N.wav | Va-ord-F#4-mf-2c-N.wav |
| A4 | D (2c) | Va-ord-A4-pp-2c-N.wav | Va-ord-A4-mf-2c-N.wav |
| C5 | A (1c) | Va-ord-C5-pp-1c-N.wav | Va-ord-C5-mf-1c-N.wav |
| D#5 | A (1c) | Va-ord-D#5-pp-1c-N.wav | Va-ord-D#5-mf-1c-T11u.wav |
| F#5 | A (1c) | Va-ord-F#5-pp-1c-N.wav | Va-ord-F#5-mf-1c-N.wav |

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
