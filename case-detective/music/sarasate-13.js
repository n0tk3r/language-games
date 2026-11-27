/* Pablo de Sarasate (1844-1908), Zigeunerweisen, Op. 20, the slow section (Un peu plus lent). The composition is in the public domain.
   Notes from: Sarasate, Zigeunerweisen Op. 20, full score typeset by Sinesio Madrona Rodenas (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 148856, SHA-256 811ba502a33206ad5851ccf7ef066af73e6a2b5ef13851d82755a0a0561eef78); the research’s fix made by music/holmes/tools/final_edit.py zig (the edited copy byte for byte the one the research checked, SHA-256 f75067d1edf028a618fe15aeb36f076bf943a4dbff26dd9308269451f4e547e0); the notes taken by music/mix/tools/holmes_extract.py --part P9; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Zigeunerweisen, the slow tune”, bars 50-66, with the file’s repeat (50-65, then 58-64 and the second ending, 66) (228.362 to 292.362 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here).
   Part: the solo violin (P9) alone; the orchestra (P1 to P8, P10 to P14) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score (the f of bar 40, in the run before the slow section, is the only mark in force until the pp of bar 62; the slow tune, marked “avec Sourdine” (with the mute), has no mark of its own, so it is played as no mark).
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py). Fixes (final.json): copy the <direction> with the tempo mark (<sound tempo>) of P1 bars 1, 13, 22, 46, 68, 69 and 72 into the same bars of P9, before their first note; keep P9 only.
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(13, {
  title: "Zigeunerweisen, Op. 20, the slow section (Un peu plus lent)", marking: "Un peu plus lent",
  ppq: 960, unit: 15,
  tempo: [0,1333333],
  vel: [0,70,28,50,37,70,47,50],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "########################################################",
  notes: "#[$Td$[$Td$x$YV%?TC3R3MPS$3O3MMS$g%Ow%[$Td$[$]d$x$[V%?YC3W3MRS$3T3MUS$g%Tw%[$Td$[$[d$x$]V%?YC3W3MRS$3T3MUS$g%Tw%d$Td$T$X[$*Y+x$YV%?UC1T3MOS$1P3MOS$g%Mw%[$Td$[$[d$x$]V%?YC3W3MRS$3T3MUS$g%Tw%d$Td$T$X[$*Y+x$YV%?UC1T3MOS$1P3MOS$g%M"
});
