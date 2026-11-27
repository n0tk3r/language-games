/* Frédéric Chopin (1810-1849), Nocturne in E-flat major, Op. 9 No. 2. The composition is in the public domain.
   Notes from: Chopin, Nocturne Op. 9 No. 2, typeset by Y.Murakami@TYO (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 66455, SHA-256 a1a3fa6644bed669e5d2217d5d60b87f3cf7bd86ce999a383998ce3e31edc00a); the notes taken by music/mix/tools/holmes_extract.py --part P1 --staff 1 --voice 1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Nocturne, Op. 9 No. 2, the opening”, bars 0 (upbeat) to 12 (0 to 78.513 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here).
   Part: the tune of the piano part (P1, staff 1, voice 1); voice 2 and the lower staff are left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(18, {
  title: "Nocturne in E-flat major, Op. 9 No. 2", marking: "Andante",
  ppq: 960, unit: 1,
  tempo: [0,1333333,480,1034483,2400,1052632,2880,1071429,3360,1034483,4800,1052632,5760,1090909,6240,1052632,7200,1333333,7296,1250000,7680,1034483,8640,1071429,9120,1052632,10080,1090909,10560,1071429,11520,1111111,12000,1034483,13440,1052632,14400,1090909,14880,1071429,18240,1111111,18720,1153846,19200,1052632,19680,1153846,20160,1250000,20640,1034483,22080,1090909,23040,1224490,23520,1034483,24960,1052632,25440,1071429,25920,1090909,26400,1052632,26880,1071429,27840,1052632,28320,1071429,28800,1090909,29520,1034483,30000,1052632,30480,1071429,30960,1090909,31440,1153846,31920,1333333,32160,1071429,33600,1090909,34560,1200000,35280,1034483,36320,1200000,36480,1071429,36960,1034483,37920,1052632,39360,1071429,41280,1153846,41760,1200000,42240,1034483,42720,1111111,43200,1304348,43680,1034483,45120,1090909,45600,1071429,46080,1111111,46560,1034483,48000,1052632,48960,1090909,49440,1071429,52320,1052632,52800,1071429,53280,1090909,53760,1061947,54240,1081081,54720,1100917,55200,1071429,56640,1090909,58080,1034483,59520,1052632,60480,1111111,60960,1052632,62400,1071429,63840,1052632,65280,1071429,65760,1090909,66240,1111111,66720,1250000,67200,1071429,67680,1090909,68160,1111111,68640,1153846,69120,1666667,69360,1764706],
  vel: [0,55,9,70,13,55,24,70,25,76,28,70,29,55,56,70,59,55,77,70,80,55,83,50,95,70,102,55],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "############################################################################################################################",
  notes: "#o-Ko-oMToMo-Ro-o-To-PCRPCo5P`8o-Ko-`8T`8o-Mo-`8Y`8o-To-PCWPCo5U`8o-To-PCRPC`8T`8o-Oo-PCPPCP?MPCo-Ko-`,[o-o-Yo-`(W`(`(U`(`(T`(o'U`(`(M`(`(O`(P?P`X$o-Ko-PCTPC`(R`(`(T`(`(R`(`(Q`(`(R`(`(T`(`,Ro-P=Po=`(R`(`(P`(`(O`(`(P`(`(R`(o'T`(`(L`(o'M`(`(N`(o'M`(`(R`(o'Q`(`(U`(o'T`(`(Z`(`(Y`(o'T`(PCWPCo5U`8o-To-PCRPCt$Qt$t$Rt$j&TU*o-To-`,Oo-PCPPCP?MPCo-Ko-`,[o-`(Yo-o%W`(o%U`(o%T`(o%U`(t$Ut$j&Mj&`(O`(`LPoMo-Oo-o-Po-PCRPC`8T`8`,Ro-PCRPCP?MPC`(Po-`(Po-`(Po-o-Po-`(O`(`(P`(P+RP+`%Po%PCPPCP?KPCPCWPC`8V`8o-To-PCJ#PCRPCPCK#PCOPCP?H#P?PPC`(J#`(Oo-`(J#`(Mo-`(J#`(Oo-`(F#`(Ko-`(G#`(Lo-`(E#`(Lo-`(E#`(K#`(Mo-`(F#`(J#`(Mo-`(I#`(O"
});
