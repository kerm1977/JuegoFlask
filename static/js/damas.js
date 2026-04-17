// ✂️ ========================================================= ✂️
// ✂️ INICIO LÓGICA DAMAS -> CORTAR Y PEGAR EN: damas.js        ✂️
// ✂️ ========================================================= ✂️

/**
 * Reglas de movimiento válidas para las Damas. Calcula los saltos, movimientos simples,
 * comportamiento de las piezas normales (solo adelante) y Reyes (ambas direcciones).
 * @param {Array} board - Estado del tablero 8x8.
 * @param {number} startIdx - Índice origen de la ficha.
 * @param {number} pNum - Número del jugador actual.
 * @param {boolean} onlyJumps - Si es true, solo devuelve array con los índices de salto/captura.
 * @returns {Array} Casillas válidas a las que se puede mover.
 */
function getValidCheckersMoves(board, startIdx, pNum, onlyJumps) {
    let moves = []; let r = Math.floor(startIdx/8), c = startIdx%8;
    let isKing = board[startIdx] > 2; let dirs = [];
    if (pNum === 1 || isKing) dirs.push([-1, -1], [-1, 1]); 
    if (pNum === 2 || isKing) dirs.push([1, -1], [1, 1]);   
    for (let [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            let ni = nr * 8 + nc;
            if (!onlyJumps && board[ni] === 0) moves.push(ni); 
            else if (board[ni] !== 0 && board[ni] !== pNum && board[ni] !== pNum + 2) {
                let nnr = r + dr * 2, nnc = c + dc * 2;
                if (nnr >= 0 && nnr < 8 && nnc >= 0 && nnc < 8 && board[nnr * 8 + nnc] === 0) moves.push(nnr * 8 + nnc); 
            }
        }
    } return moves;
}

// ✂️ ========================================================= ✂️
// ✂️ FIN LÓGICA DAMAS                                          ✂️
// ✂️ ========================================================= ✂️

