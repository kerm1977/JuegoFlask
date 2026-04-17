// ✂️ ========================================================= ✂️
// ✂️ INICIO LÓGICA GATO -> CORTAR Y PEGAR EN: gato.js          ✂️
// ✂️ ========================================================= ✂️

/**
 * Función auxiliar para el algoritmo de IA (Gato).
 * Devuelve el índice vacío que permite ganar en este turno al jugador evaluado.
 * @param {Array} board - Estado del tablero de Gato.
 * @param {number} player - Número de jugador a evaluar (1 o 2).
 * @returns {number} Índice de la casilla ganadora o -1.
 */
function findWinningMoveGato(board, player) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let l of lines) {
        let [a,b,c] = l;
        if (board[a]===player && board[b]===player && board[c]===0) return c;
        if (board[a]===player && board[c]===player && board[b]===0) return b;
        if (board[b]===player && board[c]===player && board[a]===0) return a;
    }
    return -1;
}

/**
 * Verifica si hay victoria en el clásico juego de Gato (3x3).
 * @param {Array} b - Tablero de 9 posiciones.
 * @returns {Object|null}
 */
function checkTicTacToeWin(b) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let l of lines) { 
        if(b[l[0]] !== 0 && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return {p: b[l[0]], line: l};
    }
    return b.includes(0) ? null : {p: -1, line: []};
}

// ✂️ ========================================================= ✂️
// ✂️ FIN LÓGICA GATO                                           ✂️
// ✂️ ========================================================= ✂️

