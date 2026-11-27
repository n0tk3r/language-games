/* Felix Mendelssohn (1809-1847), Song Without Words in E major, Op. 19 No. 1. The composition is in the public domain.
   Notes from: Mendelssohn, Song Without Words Op. 19 No. 1, typeset by pental (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 77217, SHA-256 5e56f55dc6d9174ed3f560adc8ffc007be1486455df30a7dfed92f579d6dd983); the notes taken by music/mix/tools/holmes_extract.py --part P1 --staff 1 --voice 1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Song Without Words, Op. 19 No. 1, the opening”, bars 3-16, with the written repeat (3-15, then 3-14 and the second ending, 16) (5.854 to 81.951 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here); “Song Without Words, Op. 19 No. 1, the close”, bars 30-50 (to the end) (120 to 181.463 s of the piece at its written tempo, as music/holmes/final.json gives them; 114.146 s here). The bars between them are in the file too; no entry plays them.
   Part: the tune of the piano part (P1, staff 1, voice 1); the accompaniment (voice 2 and the lower staff) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(15, {
  title: "Song Without Words in E major, Op. 19 No. 1", marking: "Andante con moto",
  ppq: 960, unit: 30,
  tempo: [0,731707],
  vel: [0,70,24,76,26,55,46,70,70,76,72,55,108,76,133,55,153,50,165,76,186,55,214,76,244,50],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "#########################################################################################################################################################################################################################################################",
  notes: "#?IC?GC?ECCQCCPCCNC?LC?NC?JC1L31G3?IC1L31J3d$Id$1GCCJCCICCGC?ECCQCCPCCNC?LCCUCx$NV%CUCx$NV%CNCCNCCQCCPC3N31I3d$Ld$[$Kd$d$Jd$1IC?ICCKCCLCCPC;N;*L+[$LV%CJC?IC?GC?ECCQCCPCCNC?LC?NC?JC1L31G3?IC1L31J3d$Id$1GCCJCCICCGC?ECCQCCPCCNC?LCCUCx$NV%CUCx$NV%CNCCNCCQCCPC3N31I3d$Ld$[$Kd$d$Jd$1IC?ICCKCCLCCPC;N;*L+[$LV%1G31G3?HC1G31E3?JC1J31J3?LC1J31H3?MC1M31M3?OC1M31L3?TC1S31Q3?OC?OC*O+*S+*V+*Y+*X+*V+*T+*S+*Q+*P+:S;*Q+*O+*M+*L+*J+*I+*J+*I+*J+*L+*M+COCCLCCJC?QCCOCCLC?JC1L31M31L33L33O31L31L33J33H31J3W&LY&3L33O31L31L33J33H31J3x$LV%CKC[$LV%CMC[$LV%CJCCICCGC?ECCQCCPCCNC?LC?NC3J33N33L33G31I33I33L31J3d$Id$1GC1I31J3CLCCICCGC?NCCLCCICCGC?QCCQCMLS$3L33N31L3d$Jd$3I33G33I31J3CLCCICCGC?NCCLCCICCGC?QCCPC?NC3L33P33S33V33U33P33S33Q33P33N33J31G3d$Ed$d$Dd$d$Cd$1BCCBC?DC?EC?IC8G;*E+[$EV%CCC[$BV%CAC[$@V%1I31G3[$EV%CIC[$Ed$[$Ed$g%=#g%E"
});
