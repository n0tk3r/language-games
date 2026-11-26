/* Antonio Vivaldi (1678-1741), The Four Seasons: Autumn (L’autunno), Concerto in F major, Op. 8 No. 3, RV 293, from Il cimento dell’armonia e dell’inventione (1725): II. Adagio molto. The composition is in the public domain.
   Notes from: Autumno / Autumn, Op. 8, No. 3, typeset by Anonymous for the Mutopia Project (Mutopia-2010/02/08-350, CC BY-SA 3.0), https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=350, its MIDI file mid/autumn-score-1.mid.
   That edition is shared under the Creative Commons Attribution-ShareAlike 3.0 license (https://creativecommons.org/licenses/by-sa/3.0/), and so is this note list made from it.
   Bars: 1-45, the whole movement.
   Parts: solo (violin, tune); violin I (violin, tune); violin II (violin, accompaniment); viola (viola, accompaniment); cello (cello, bass).
   Velocities (the calm plan of tools/build-piece.js): Piano, then Più Piano, then Pianissimo in every part (the edition’s words; LilyPond’s MIDI file carries none, every note is 90), so each part is played as p: tune 55, the rest 50.
   Ornaments: none written.
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(1, {
  title: "Autumn, the slow movement", marking: "Adagio molto",
  ppq: 384, unit: 384,
  tempo: [0,1132075],
  vel: [0,50,3,55,4,50,7,55,8,50,9,55,10,50,11,55,12,50,15,55,16,50,19,55,20,50,23,55,24,50,25,55,26,50,27,55,28,50,31,55,32,50,33,55,34,50,35,55,36,50,39,55,40,50,42,55,43,50,44,55,45,50,46,55,47,50,49,55,51,50,52,55,53,50,54,55,55,50,58,55,59,50,61,55,62,50,63,55,64,50,65,55,66,50,69,55,70,50,71,55,72,50,73,55,74,50,77,55,78,50,79,55,80,50,81,55,82,50,85,55,86,50,90,55,91,50,95,55,96,50,97,55,98,50,100,55,101,50,104,55,105,50,108,55,109,50,110,55,111,50,112,55,113,50,114,55,115,50,117,55,118,50,120,55,121,50,122,55,123,50,124,55,125,50,127,55,128,50,130,55,131,50,132,55,133,50,134,55,135,50,136,55,137,50],
  parts: [
    { name: "solo", inst: "violin", role: "tune" },
    { name: "violin I", inst: "violin", role: "tune" },
    { name: "violin II", inst: "violin", role: "accompaniment" },
    { name: "viola", inst: "viola", role: "accompaniment" },
    { name: "cello", inst: "cello", role: "bass" }
  ],
  part: "'&%#'&%#%#%#'&%#'&%#'&%#%#%#'&%#%#%#'&%#'%#%#%#'%#$%#%#'&%#'%#%#%#'&%#%#%#'&%#%#%#'&%#'%&%#'&%%#%#&%#'&%#'&%#%#%#%#&%#&%#%#%#&%#&%#%#%#&#&%",
  notes: "#/7&/?&,H&)Q&,6&)E#'T#'W'$R#$V$$Q#$T$&5#&C#&S#&V&&7#&L#&Q#&U&)8#)M#'S#'V'$Q#$T$$P#$S$)3#)N#'Q#'T'$O#$S$$N#$Q$&2#/L#&P#&S&&0#$Q#$T$$S#$V$$T#$X$)1#'O#'R&$R$$M#$Q$$L#$O$&0#)J#&N#&Q&&.#$O#$R$$Q#$T$$R#$V$)-#)A#'T#'W'$R#$U$$Q#$T$)4#)C#'R#'U'$Q#$T$$O#$R$&3#)A#&Q#)T&)1#&P&&I#&M#*R&,0#)@#'O'$M#$Q$$L#$O$&J#&N#&Q&&1#&L#&O#&R&P$2#)J#$N#$Q$$O#$R$$Q#$T$&R#&V&&N#&Q#&T&,J#&O#&R&&N#&Q&&O#&R&&N#&Q#&T&,J#&O#&R&&N#&Q&,O#&R&)I#2Q),J#,N"
});
