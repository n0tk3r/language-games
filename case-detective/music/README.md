# The music

Case Detective can play Niccolò Paganini's 24 Caprices for solo violin, Op. 1, in the background. No recording is used: `../js/music.js` is a small violin synthesizer (Web Audio API) that plays note lists, one file `caprice-NN.js` for each piece, named in `list.js`.

No piece is in the game yet. The composition is in the public domain, but a note list has to be made from an edition that somebody typeset, and each edition has its own licence. Until `list.js` names a piece, the game stays silent and shows no music button.
