/* Richard Wagner (1813-1883), Träume (Dreams), No. 5 of the Wesendonck Songs, WWV 91. The composition is in the public domain.
   Notes from: Wagner, Träume, typeset by OpenScore Lieder (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 140061, SHA-256 0f2c9ad598a8b0efa0f6742e0c46718c33364ca51568ed38998234e828818b55); the notes taken by music/mix/tools/holmes_extract.py --part P1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Träume (Dreams), the second half”, bars 41-68 (120 to 198.26 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here).
   Part: the voice part (P1); the piano (P2) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(16, {
  title: "Tr\u00e4ume (Dreams), No. 5 of the Wesendonck Songs, WWV 91", marking: "Sehr m\u00e4ssig bewegt",
  ppq: 960, unit: 30,
  tempo: [0,1000000,64,923077,96,882353,480,952381,512,1000000,576,923077,600,857143,672,1000000,832,923077,864,857143,888,800000,1280,869565,1344,909091,1632,952381,1696,983607,1728,1000000],
  vel: [0,55,31,76,33,55,87,50],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "##############################################################################################",
  notes: "#?Md$1O31Q38R;*J+8O;*M+1K31J38J;*H+8K;*J+8M;*L+8O;*M+8P;*O+8M;*K+d$Kd$?JC8I;*H+MHS$1C38O;*M+MMS$1C3x$RV%?Pd$1F31H38K;*I+8G;*D+1F31G38I;*K+MMS$1N3?KC1J31K38R;*P+8N;*M+8S;*P+8M;*K+8I;*J+MKS$1F3CIC?HC;F;+D+;M;+I+CDC;I;+M+S$PS$3O3?NC[$Md$?HCMIS$1K38M;*N+r$PV%d$Id$CJCd$Kd$CLCd$Md$CLCd$Md$?Ld$CFCCKd$CJCCAd$CBCCDCx$F"
});
