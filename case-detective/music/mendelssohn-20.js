/* Felix Mendelssohn (1809-1847), Venetian Gondola Song in G minor, Op. 19 No. 6 (Song Without Words). The composition is in the public domain.
   Notes from: Mendelssohn, Venetian Gondola Song Op. 19 No. 6, typeset by hmscomp (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 65449, SHA-256 3e7034f42d9b93c5eb1eb794c24e6b566d0427bb2f771a58cfb0b15d2ab7f995); the research’s fix made by music/holmes/tools/final_edit.py gondola (the edited copy byte for byte the one the research checked, SHA-256 f8f46b4593c4bc446577e00a964fb1067eea1708345d7659299a0e2d00e82c9e); the notes taken by music/mix/tools/holmes_extract.py --part P1 --staff 1 --voice 1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Venetian Gondola Song, Op. 19 No. 6”, bars 7 (from the tune’s first note, late in the bar) to 42; bars 1-6 are the introduction, and 43-46 a close of a few single low notes and long rests (16.035 to 99.714 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here).
   Part: the tune of the piano part with its double notes (P1, staff 1, voice 1); the rocking accompaniment (voice 2 and the lower staff) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py). Fixes (final.json): P1 bar 25, beat 0 (56.000 s), staff 1, voice 1: D4+F#4+A4+D5: keep A4+D5; P1 bar 33, beat 5/2 (78.200 s), staff 1, voice 1: C4+D4+F#4: keep D4+F#4; P1 bar 34, beat 0 (78.640 s), staff 1, voice 1: Bb3+D4+G4: keep D4+G4.
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(20, {
  title: "Venetian Gondola Song in G minor, Op. 19 No. 6 (Song Without Words)", marking: "Andante sostenuto",
  ppq: 960, unit: 15,
  tempo: [0,750000,608,810811,768,750000,1312,810811,1760,909091,1920,750000,2528,810811,2688,750000,3072,810811,4160,882353,4256,810811,4448,882353,5024,810811,5120,750000,5984,810811],
  vel: [0,55,29,50,54,76,56,55,57,70,58,50,64,55,70,50,72,55,86,50,101,55,104,50,115,55,123,50,133,76,134,70,144,55,174,50],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "##############################################################################################################################################################################################",
  notes: "#?K#?OC[$J#[$Md$?H#?KC[$G#[$Jd$?J#?MC[$C#[$Kd$?A#?JC[$?#[$Hd$?CC[$A#[$Dd$?A#?DC1A#1D31C#1F3?D#?HC?A#?D]'?K#?OC[$J#[$Md$?H#?KC[$G#[$Jd$?J#?MC[$C#[$Kd$?A#?JC??#?HC?HC?JC?KC?NC?OC?N#?RC?QC?OC[$O#[$Vd$?RC[$Od$?JC*KC?E#?NC?F#?OC?J#?RC?H#?QC?F#?OCs%F#s%Oj&?OC[$Rd$?OC[$Md$?LC[$Md$?HC[$Id$?LC[$Md$?HC[$Id$?LCs%Mj&?MC[$Pd$?JC[$Pd$?JCb&Pj&?OC[$Md$?KC?JC?KC?HC?J#?OC3OC3OC3OC3OC?OC3OC3KC3PCCOd$3TC3OC3KC3PCCOd$3TC?OC?MC?KC[$Jd$?JC[$Od$?JC[$Md$?KC?OC?KC?PC[$Od$?TC?OC?KC?PC[$Od$`$Td$?TC?PC?OC?PC?MC?KC?MC?JC?HC?JC?C#?GC?C#?Hj&?K#?OC[$J#[$Md$?H#?KC[$G#[$Jd$?D#?MC[$C#[$Kd$?O#?[C[$O#[$[d$?C#?KC[$A#[$Jd$??#?HC[$>#[$Gd$?G#?JC[$C#[$Hd$?O#?[C[$O#[$[d$?C#?KC[$Hd$?O#?[C[$O#[$[]'P'F]'x$DV%b&C"
});
