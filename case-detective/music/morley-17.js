/* tune published by Thomas Morley (in his First Book of Consort Lessons, 1599) (about 1557-1602), O Mistress Mine (song from Shakespeare’s Twelfth Night). The composition is in the public domain.
   Notes from: O Mistress Mine by T. Morley, typeset by Ariel Barton for the Mutopia Project (https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2179, Mutopia-2017/04/30-2179), Public Domain, its MIDI file O_Mistress_Mine.mid (SHA-256 5f1edebff83b161508aa82c2aead18babb8999dab98b691e9a1ac02a8ec3f929); the passages cut out by music/mix/tools/midi-window.js. Made by music/mix/tools/build-holmes.js.
   That edition was placed in the public domain (https://www.mutopiaproject.org/legal.html), and so is this note list made from it.
   Passages: “O Mistress Mine, the first verse”, bars 5-32 (6 to 48 s of the piece at its written tempo, as music/holmes/final.json gives them; 0 s here); “O Mistress Mine, the second verse”, bars 37-64 (54 to 96 s of the piece at its written tempo, as music/holmes/final.json gives them; 48 s here). The bars between them are in the file too; no entry plays them.
   Part: the sung tune (the MIDI file’s track “vocalist:vocalist”); the piano (PianoUp, PianoDown) is left out, played on the violin as the tune.
   Velocities: the calm plan of tools/build-piece.js on the dynamics of the score (the MIDI file’s only velocity, 63, is LilyPond’s for a score without marks, so it is played as no mark).
   Ornaments: trills, turns and mordents are played as the plain note, grace notes as short notes of their own (tools/mxl2mid.py).
   Made by tools/build-piece.js (buildEnsemble); read by js/music.js. */
Music.define(17, {
  title: "O Mistress Mine (song from Shakespeare\u2019s Twelfth Night)", marking: "Allegro moderato",
  ppq: 384, unit: 192,
  tempo: [0,500000],
  vel: [0,70],
  parts: [
    { name: "violin", inst: "violin", role: "tune" }
  ],
  part: "##########################################################################################################################",
  notes: "#%H%%L%%L%'J''H'%L%%N%%O%'O'%H%%L%%L%'J''H'%L%%N%%O%'O'%O%%Q%%Q%'Q''L'%O%%O%%O%'O'%O%%Q%%O%'T''L'%J%%H%'M''L'%J%%H%&E&$E$$H$$H$'L'%J%)H)%O%%Q%%O%'T''L'%J%%H%%M%%M%'L'%J%%H%'E'%H%'L'%J%)HA%H%'L''J''H'%L%%N%%O%'O'%H%'L''J''H'%L%%N%%O%'O'%O%%Q%%Q%'Q''L'%O%%O%%O%'O'%O%%Q%%O%'T''L'%J%%H%'M''L'%J%%H%&E&$E$$H$$H$'L'%J%)H)%O%%Q%%O%'T''L'%J%%H%%M%%M%'L'%J%%H%'E'%H%'L'%J%)H"
});
