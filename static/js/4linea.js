// ✂️ ========================================================= ✂️
// ✂️ INICIO LÓGICA 4 EN LÍNEA -> CORTAR Y PEGAR EN: 4linea.js  ✂️
// ✂️ ========================================================= ✂️

/**
 * Función auxiliar para el algoritmo de IA (4 en Línea).
 * Calcula en qué fila caería una ficha si se suelta en una columna específica.
 * @param {Array} board - Estado del tablero 4 en Línea.
 * @param {number} col - Índice de la columna (0 a 6).
 * @returns {number} Fila donde caerá la ficha o -1 si la columna está llena.
 */
function getC4DropRow(board, col) {
    for(let r=5; r>=0; r--) {
        if(board[r*7+col] === 0) return r;
    }
    return -1;
}

/**
 * Evalúa el tablero de 4 en Línea verificando horizontal, vertical y diagonalmente
 * para buscar 4 casillas iguales.
 * @param {Array} b - Array del tablero (42 casillas).
 * @returns {Object|null} Retorna {p: Jugador, line: [casillas]} o null.
 */
function checkC4Win(b) {
    for(let r=0; r<6; r++) {
        for(let c=0; c<7; c++) {
            let p = b[r*7+c]; if(p === 0) continue;
            if(c<=3 && p===b[r*7+c+1] && p===b[r*7+c+2] && p===b[r*7+c+3]) return {p: p, line: [r*7+c, r*7+c+1, r*7+c+2, r*7+c+3]};
            if(r<=2 && p===b[(r+1)*7+c] && p===b[(r+2)*7+c] && p===b[(r+3)*7+c]) return {p: p, line: [r*7+c, (r+1)*7+c, (r+2)*7+c, (r+3)*7+c]};
            if(r<=2 && c<=3 && p===b[(r+1)*7+c+1] && p===b[(r+2)*7+c+2] && p===b[(r+3)*7+c+3]) return {p: p, line: [r*7+c, (r+1)*7+c+1, (r+2)*7+c+2, (r+3)*7+c+3]};
            if(r<=2 && c>=3 && p===b[(r+1)*7+c-1] && p===b[(r+2)*7+c-2] && p===b[(r+3)*7+c-3]) return {p: p, line: [r*7+c, (r+1)*7+c-1, (r+2)*7+c-2, (r+3)*7+c-3]};
        }
    } return b.includes(0) ? null : {p: -1, line: []};
}

// ✂️ ========================================================= ✂️
// ✂️ FIN LÓGICA 4 EN LÍNEA                                     ✂️
// ✂️ ========================================================= ✂️


