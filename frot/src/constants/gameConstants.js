export const Status = {
  'ongoing': 'Ongoing',
  'promoting': 'Promoting',
  'white': 'White wins',
  'black': 'Black wins',
  'stalemate': 'Game draws due to stalemate',
  'insufficient': 'Game draws due to insufficient material',
};

export const createPosition = () => {
  const position = new Array(10).fill("").map((x) => new Array(10).fill(""));
  
  // Setup pawns
  for (let i = 0; i < 10; i++) {
    position[8][i] = "bp";  // Black pawns
    position[1][i] = "wp";  // White pawns
  }

  // Setup white pieces
  position[0][0] = "wr";  // Rook
  position[0][1] = "wn";  // Knight
  position[0][2] = "wb";  // Bishop
  position[0][3] = "wm";  // Minister
  position[0][4] = "wq";  // Queen
  position[0][5] = "wk";  // King
  position[0][6] = "wm";  // Minister
  position[0][7] = "wb";  // Bishop
  position[0][8] = "wn";  // Knight
  position[0][9] = "wr";  // Rook

  // Setup black pieces
  position[9][0] = "br";  // Rook
  position[9][1] = "bn";  // Knight
  position[9][2] = "bb";  // Bishop
  position[9][3] = "bm";  // Minister
  position[9][4] = "bq";  // Queen
  position[9][5] = "bk";  // King
  position[9][6] = "bm";  // Minister
  position[9][7] = "bb";  // Bishop
  position[9][8] = "bn";  // Knight
  position[9][9] = "br";  // Rook

  return position;
};

export const initGameState = {
  position: [createPosition()],
  turn: 'w',
  candidateMoves: [],
  movesList: [],
  promotionSquare: null,
  status: Status.ongoing,
  castleDirection: {
    w: 'both',
    b: 'both'
  },
  PlayerId: null,
  currentIndex: 0
}; 