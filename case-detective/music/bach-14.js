/* Johann Sebastian Bach (1685-1750), Air from Orchestral Suite No. 3 in D major, BWV 1068. The composition is in the public domain.
   Notes from: Bach, Air from Orchestral Suite No. 3, typeset by Jyel (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 6199, SHA-256 976675c29d0794d1b4b58977505f45ae375e728b83079b04c0a264785d68677f); the notes taken by music/mix/tools/holmes_extract.py --part P1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Air, the first half”, bars 1-6, once (bar 6 is the first ending; it ends on a long A) (0 to 48 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here); “Air, the second half”, bars 8-19, once (96 to 192 s of the piece at its written tempo, as music/holmes/final.json gives them; 96 s here). The bars between them are in the file too; no entry plays them.
   Part: the first violin (P1); the other parts (P2 to P4) are left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(14, {
  title: "Air from Orchestral Suite No. 3 in D major, BWV 1068", marking: "",
  ppq: 960, unit: 5,
  tempo: [0,2000000],
  vel: [0,70],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "##################################################################################################################################################################################################",
  notes: "#{5SY6MXS$MTS$1S3?QCMOS$MNS$MOS$r&N]'8L;]&Jr&f,Vl,MSS$S$MS$MLS$S$QS$MPS$S$VS$MTS$f,Tl,MQS$S$LS$MJS$S$OS$MNS$S$TS$MSS$l(Sc)MUS$MVS$x$OV%8O;8Q;S$SS$MSS$MQS$S$QS$MOS$MNS$MLS$8L;8N;S$OS$x$OV%MNS$MLS$f*Ji+{5SY6MXS$MTS$1S3?QCMOS$MNS$MOS$r&N]'8L;]&Jr&f,Vl,MSS$S$MS$MLS$S$QS$MPS$S$VS$MTS$f,Tl,MQS$S$LS$MJS$S$OS$MNS$S$TS$MSS$l(Sc)MUS$MVS$x$OV%8O;8Q;S$SS$MSS$MQS$S$QS$MOS$MNS$MLS$8L;8N;S$OS$x$OV%MNS$MLS$f*Ji+Y(N`(8O;8N;8L;8N;MJS$l(Vc)x$MV%x$LV%S&XY&MVS$MTS$MSS$r'Tu';S;;Q;8O;MNS$MLS$MKS$MLS$V%NV%MNS$MOS$V%QV%MQS$MSS$V%TV%x$TV%x$SV%MQS$MOS$MNS$MLS$S$NS$;O;8Q;x$OV%f*Li+Y(O`(MSS$MQS$MOS$V)Xc)MVS$MUS$1S3?QCMVS$x$JV%u%LY&8N;8O;u%NY&MLS$r&J]'l(Oc)S$SS$MQS$l(Qc)S$TS$MSS$l(Sc)S$VS$MTS$f*Ti+Y(J`(MNS$MQS$MTS$MTS$MQS$P'S]'MSS$8T;8V;Y(O`(MSS$MVS$MYS$l(Xc)x$OV%MNS$MQS$r&T]'x$OV%x$JV%MQS$8S;f$Tl$x$SV%MQS$8O;8N;x$LV%MNS$V%OV%MNS$MOS$f*O"
});
