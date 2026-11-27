/* Johann Sebastian Bach (1685-1750), Andante from Sonata No. 2 in A minor for violin alone, BWV 1003. The composition is in the public domain.
   Notes from: Bach, Sonata No. 2 BWV 1003, typeset by Musemeister (MuseScore, CC0 1.0), from PDMX (CC BY 4.0), its MusicXML file (PDMX 48596, SHA-256 c4d038f1fc9476d647850cd5b66c0a5065f74a71b03a32c8653663e8b84af047); the notes taken by music/mix/tools/holmes_extract.py --part P1; turned into MIDI by tools/mxl2mid.py --parts; the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That score was released into the public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/), and so is this note list made from it. PDMX is by Phillip Long, Zachary Novack, Julian McAuley and Taylor Berg-Kirkpatrick (2025, https://doi.org/10.5281/zenodo.14648209), shared under the Creative Commons Attribution 4.0 license (https://creativecommons.org/licenses/by/4.0/).
   Passages: “Andante, BWV 1003, the first half”, bars 1-11, the second time through (the first half is repeated; this time it ends with the second ending, bar 11) (629.238 to 685.81 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here).
   Part: the violin part (P1), Bach’s own double stops and chords, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score (the file holds the whole sonata, and the last mark of the Fuga, f, runs on into the Andante, which has none of its own, so it is played as no mark).
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(21, {
  title: "Andante from Sonata No. 2 in A minor for violin alone, BWV 1003", marking: "Andante",
  ppq: 960, unit: 1,
  tempo: [0,1714286],
  vel: [0,70],
  slur: 1,
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "#######################################################################################################################################################################",
  notes: "#`,A#o5Eo-`,Ao-`,Ao-`,A#`,Eo-`,A#o'F`(o'E`(](A#o'C`(o'A`(`,@#o'H`(o'C`(`,@#P7Fo-`,@o-`,@#`,Jo-`,@#o'H`(o'F`(`,@#o'E`(o'C`(`,A#o'E`(o'H`(`,A#o'J`(o'L`(`,>#o'H#`,M`(o'H`(`,>#o'J`(o'E`(`,C#o'G`(o'J`(`,C#o'L`(o'M`(`,<#`,C#o'L`(o'J`(`,<#`,Ho-`,Ho-`,H#o'Q`(o'O`(`,H#o'Q`(o'O`(`,H#o'M`(o'L`(`,H#o5Jo-`,Ho-`,Fo-`,F#o'O`(o'Q`(`,F#o'O`(o'M`(`,F#o'L`(o'J`(`,F#o'L`(o'O`(`,F#o'Q`(o'R`(`,E#o'O#`,T`(o'O`(`,E#o'Q`(o'L`(`,J#o'M`(o'Q`(`,J#o'V`(o'T`(`,C#o'M#`,R`(o'M`(`,C#o'O`(o'J`(`,H#o'L`(o'M`(`,H#o'O`(o'Q`(`,<#`,C#`,L#o'R`(o'V`(`,<#`,C#`,L#o'T`(o'R`(`,A#`,H#`,M#`,Qo-`,Ao-`,A`(o'O`(`,A#`,E#o'M`(o'L`(`,A#`,E#o'J`(o'H`(`,A#`%Go%`%Ho%o'E`(`,A#o'G`(o'C`(o'E`(o'G`(o%Ho%o%Lo%o%Jo%o%Mo%o%Lo%o%Oo%o%Mo%`%Qo%o5@#o5H#o5O`8o'A`(o%Qo%o%Oo%o%Mo%o%Oo%o'Q`(`HC#P0L`0W$M`$W$L`$`%Jo%`%Lo%`,Mo-`,Jo-P[$<#P[$H"
});
