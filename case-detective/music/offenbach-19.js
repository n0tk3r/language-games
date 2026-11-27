/* Jacques Offenbach (1819-1880), Barcarolle (“Belle nuit, ô nuit d’amour”) from The Tales of Hoffmann. The composition is in the public domain.
   Notes from: Offenbach, Barcarolle, flute part typeset by Myra Occupy Graham (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 132471, SHA-256 b9066ebcf1b967a33ef94715797e21b01bbbb15e06bdca9bdc0b19baf837c04e); the notes taken by music/mix/tools/holmes_extract.py --part P1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Barcarolle from The Tales of Hoffmann”, bars 3-31 (the tune from its first note to the end of its first statement) (4.5 to 69.75 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here); “Barcarolle from The Tales of Hoffmann, the return”, bars 32-56 (to the end; the flute rests 4.3 s, as played, around bar 40) (69.75 to 126 s of the piece at its written tempo, as music/holmes/final.json gives them; 65.25 s here).
   Part: the flute part (P1), as written, in B-flat major; the piano (P2) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score.
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(19, {
  title: "Barcarolle (\u201cBelle nuit, \u00f4 nuit d\u2019amour\u201d) from The Tales of Hoffmann", marking: "Moderato",
  ppq: 960, unit: 5,
  tempo: [0,750000],
  vel: [0,55,32,70,82,76,104,55,141,70,181,50],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "######################################################################################################################################################################################",
  notes: "#r&O]'x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%c)Oc)r&Oc)r&O]'x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%c)Oc)r&Oc)r&R]'x$TV%r&T]'x$VV%r&V]'x$WV%r&W]'x$VV%r&V]'x$TV%8T;8V;u%TY&x$RV%Y.Ru/r&R]'x$TV%r&T]'x$VV%r&V]'x$WV%r&W]'x$VV%r&V]'x$TV%8T;8V;u%TY&x$RV%Y.Ru/r&R]'x$TV%r&T]'x$UV%u/Wu/x$WV%x$RV%x$TV%1U31W3[$Ud$x$TV%x$RV%l(Tc)x$T]'x$TV%r&T]'x$VV%r&V]'x$WV%u/Yu/x$YV%V%TV%x$VV%1V31W3d$Wd$V%VV%x$TV%r&Ru/c)Tc)x$TV%V%VV%x$TV%r&Ru/c)Rc)x$RV%V%VV%x$TV%r&Rc)l(Rc)Y.Ru/r&O]'x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%c)Oc)r&Oc)r&O]'x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%V%OV%x$MV%x$PV%r&P]'x$OV%Y.RPCl(Ri+x$RV%x$TV%x$VV%x$WV%x$YV%u/[u/x$[V%x$YV%x$WV%V%VV%x$WV%x$TV%c)Rc)r&R]'x$TV%c)Vc)r&V]'x$VV%r&Wc)x$RV%r&W]'x$RV%]'Y]'l(Yc)x$WV%r&[]'x$RV%r&W]'x$RV%]'Y]'l(Yc)x$WV%]'[]'l([c)x$WV%]'[]'l([c)x$RV%]'W]'l(Wc)x$OV%]'R]'c)Rc)l(Rc)l(Oc)Y.K"
});
