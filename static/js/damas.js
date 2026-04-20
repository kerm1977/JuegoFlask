// Nombre: damas.js
// Ubicación: static/js/
// Función: Motor de reglas y movimientos válidos exclusivamente para el juego de Damas.

/**
 * Reglas de movimiento válidas para las Damas. 
 * LÓGICA REESCRITA Y HARDCODEADA PARA EVITAR ERRORES DE CACHÉ EN NAVEGADORES.
 * @param {Array} board - Estado del tablero 8x8.
 * @param {number} startIdx - Índice origen de la ficha.
 * @param {number} pNum - Número del jugador actual.
 * @param {boolean} onlyJumps - Si es true, solo devuelve array con los índices de salto/captura.
 * @returns {Array} Casillas válidas a las que se puede mover.
 */
window.getValidCheckersMoves = function(board, startIdx, pNum, onlyJumps) {
    let moves = []; 
    let r = Math.floor(startIdx / 8);
    let c = startIdx % 8;
    
    // Verificar si la pieza es un Rey (valor mayor a 2)
    let isKing = board[startIdx] > 2; 
    
    // FUNCIÓN DE VERIFICACIÓN BLINDADA
    // Reemplaza los arrays dinámicos para garantizar que las coordenadas (dr, dc)
    // sean siempre las diagonales exactas sin importar la memoria del navegador.
    const checkDiagonalMove = (dr, dc) => {
        let nr = r + dr;
        let nc = c + dc;
        
        // Verificamos que no se salga del tablero 8x8
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            let ni = nr * 8 + nc;
            
            // Movimiento simple a celda vacía
            if (!onlyJumps && board[ni] === 0) {
                moves.push(ni); 
            }
            // Salto/Captura: La celda tiene una ficha enemiga
            else if (board[ni] !== 0 && board[ni] !== pNum && board[ni] !== (pNum + 2)) {
                let nnr = r + (dr * 2);
                let nnc = c + (dc * 2);
                
                // Verificamos que la celda de caída exista y esté totalmente vacía
                if (nnr >= 0 && nnr < 8 && nnc >= 0 && nnc < 8) {
                    let jumpNi = nnr * 8 + nnc;
                    if (board[jumpNi] === 0) {
                        moves.push(jumpNi); 
                    }
                }
            }
        }
    };

    // Jugador 1 (Rojas) se mueve "hacia arriba" (filas disminuyen)
    if (pNum === 1 || isKing) {
        checkDiagonalMove(-1, -1); // Diagonal Arriba-Izquierda
        checkDiagonalMove(-1, 1);  // Diagonal Arriba-Derecha
    }
    
    // Jugador 2 (Azules) se mueve "hacia abajo" (filas aumentan)
    if (pNum === 2 || isKing) {
        checkDiagonalMove(1, -1);  // Diagonal Abajo-Izquierda
        checkDiagonalMove(1, 1);   // Diagonal Abajo-Derecha
    }
    
    return moves;
};