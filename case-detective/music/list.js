/* The music of the game, in two lists, and one line of credit. Read by js/music.js.
   "calm" is the background: slow, lyrical passages of twelve of the caprices, one after another, the slowest and
   gentlest first (about 20 and a half minutes before the list begins again). Each is cut out of its piece where a
   phrase ends (from, to: seconds of the piece at its written tempo, as js/music.js reads it; no from: from the
   start; no to: to the end), played at `rate` of its written tempo (0.8: eight tenths), softer and with a gentler
   tone, and faded in and out where it is cut. The three passages of No. 6 play a little softer still (level 0.5):
   their tremolo sounds without a break.
   "show" plays while the Inspector plays his violin: brilliant fast caprices, and the fast parts of others, at full
   speed and full tone.
   Which bars each passage is and why it was chosen: README.md. Written by hand: tools/build-all.js writes a plain
   list of whole pieces, so after a rebuild of this folder these two lists have to be brought back. */
Music.list([
  { n: 6, title: "Caprice No. 6, the opening", marking: "Lento", file: "caprice-06.js", mode: "calm", to: 81, rate: 0.75, level: 0.5 },
  { n: 3, title: "Caprice No. 3, the opening", marking: "Sostenuto", file: "caprice-03.js", mode: "calm", to: 82.286, rate: 0.8 },
  { n: 4, title: "Caprice No. 4, the close of the first part", marking: "Maestoso", file: "caprice-04.js", mode: "calm", from: 130.667, to: 154.667, rate: 0.75 },
  { n: 20, title: "Caprice No. 20, the opening", marking: "Allegretto", file: "caprice-20.js", mode: "calm", to: 48, rate: 0.75 },
  { n: 6, title: "Caprice No. 6, the second part", marking: "Lento", file: "caprice-06.js", mode: "calm", from: 162, to: 252, rate: 0.8, level: 0.5 },
  { n: 15, title: "Caprice No. 15, the opening", marking: "Posato", file: "caprice-15.js", mode: "calm", to: 24, rate: 0.75 },
  { n: 11, title: "Caprice No. 11, the opening", marking: "Andante", file: "caprice-11.js", mode: "calm", to: 84.087, rate: 0.8 },
  { n: 7, title: "Caprice No. 7, the opening", marking: "Posato", file: "caprice-07.js", mode: "calm", to: 47.75, rate: 0.8 },
  { n: 6, title: "Caprice No. 6, the close", marking: "Lento", file: "caprice-06.js", mode: "calm", from: 252, rate: 0.8, level: 0.5 },
  { n: 4, title: "Caprice No. 4, the second part", marking: "Maestoso", file: "caprice-04.js", mode: "calm", from: 320, to: 416, rate: 0.85 },
  { n: 22, title: "Caprice No. 22, the opening", marking: "Marcato", file: "caprice-22.js", mode: "calm", to: 48, rate: 0.8 },
  { n: 11, title: "Caprice No. 11, the close", marking: "Andante", file: "caprice-11.js", mode: "calm", from: 164.929, rate: 0.8 },
  { n: 4, title: "Caprice No. 4, the opening", marking: "Maestoso", file: "caprice-04.js", mode: "calm", to: 85.333, rate: 0.8 },
  { n: 18, title: "Caprice No. 18, the opening", marking: "Corrente", file: "caprice-18.js", mode: "calm", to: 26.182, rate: 0.75 },
  { n: 13, title: "Caprice No. 13, the opening", marking: "Allegro", file: "caprice-13.js", mode: "calm", to: 48, rate: 0.75 },
  { n: 14, title: "Caprice No. 14, the opening", marking: "Moderato", file: "caprice-14.js", mode: "calm", to: 35, rate: 0.75 },
  { n: 9, title: "Caprice No. 9, the opening", marking: "Allegretto", file: "caprice-09.js", mode: "calm", to: 48, rate: 0.75 },
  { n: 24, title: "Caprice No. 24 in A minor", marking: "Tema con variazioni. Quasi presto", file: "caprice-24.js", mode: "show" },
  { n: 5, title: "Caprice No. 5 in A minor", marking: "Agitato", file: "caprice-05.js", mode: "show" },
  { n: 16, title: "Caprice No. 16 in G minor", marking: "Presto", file: "caprice-16.js", mode: "show" },
  { n: 1, title: "Caprice No. 1 in E major", marking: "Andante", file: "caprice-01.js", mode: "show" },
  { n: 3, title: "Caprice No. 3, the middle part", marking: "Presto", file: "caprice-03.js", mode: "show", from: 82.286, to: 149 },
  { n: 23, title: "Caprice No. 23, the middle part", marking: "Minore", file: "caprice-23.js", mode: "show", from: 67.326, to: 143.372 },
  { n: 10, title: "Caprice No. 10 in G minor", marking: "Vivace", file: "caprice-10.js", mode: "show" },
  { n: 11, title: "Caprice No. 11, the middle part", marking: "Presto", file: "caprice-11.js", mode: "show", from: 84.087, to: 165.929 },
  { n: 22, title: "Caprice No. 22, the middle part", marking: "Minore", file: "caprice-22.js", mode: "show", from: 48, to: 129.818 },
  { n: 2, title: "Caprice No. 2 in B minor", marking: "Moderato", file: "caprice-02.js", mode: "show" },
  { n: 13, title: "Caprice No. 13, the middle part", marking: "Minore", file: "caprice-13.js", mode: "show", from: 48, to: 114.461 },
  { n: 9, title: "Caprice No. 9, the middle part", marking: "Allegretto", file: "caprice-09.js", mode: "show", from: 71, to: 125.333 },
  { n: 18, title: "Caprice No. 18, the middle part", marking: "Allegro", file: "caprice-18.js", mode: "show", from: 26.182, to: 104.727 },
  { n: 20, title: "Caprice No. 20, the middle part", marking: "Minore", file: "caprice-20.js", mode: "show", from: 48, to: 115.091 },
  { n: 12, title: "Caprice No. 12, the first part", marking: "Allegro", file: "caprice-12.js", mode: "show", to: 62.4 }
], "Notes typeset by Andrew Buck and Samuel Rummel for the Mutopia Project (CC BY-SA 3.0 and CC BY-SA 4.0) and by Musemeister on MuseScore (public domain, CC0 1.0), via PDMX (Long et al., CC BY 4.0). Violin recordings from TinySOL (Cella et al., CC BY 4.0).");
