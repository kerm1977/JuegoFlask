// ✂️ ========================================================= ✂️
// ✂️ INICIO LÓGICA REVERSI -> CORTAR Y PEGAR EN: reversi.js    ✂️
// ✂️ ========================================================= ✂️

/**
 * Evalúa las reglas de Reversi/Othello. Calcula qué fichas enemigas serían
 * volteadas si el jugador coloca su ficha en un índice determinado.
 * @param {Array} board - Estado del tablero de Reversi.
 * @param {number} idx - Índice donde se quiere colocar la ficha.
 * @param {number} pNum - Número del jugador actual.
 * @returns {Array} Un array con los índices de todas las fichas que serían volteadas.
 */
function getReversiFlips(board, idx, pNum) {
    if (board[idx] !== 0) return [];
    let flips = []; let opp = pNum === 1 ? 2 : 1;
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    let r = Math.floor(idx/8), c = idx%8;
    for(let [dr, dc] of dirs) {
        let path = []; let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === opp) { path.push(nr*8+nc); nr += dr; nc += dc; }
        if(nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === pNum && path.length > 0) flips.push(...path);
    }
    return flips;
}

// ✂️ ========================================================= ✂️
// ✂️ FIN LÓGICA REVERSI                                        ✂️
// ✂️ ========================================================= ✂️

