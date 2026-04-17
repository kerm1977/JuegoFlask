// ✂️ ========================================================= ✂️
// ✂️ INICIO LÓGICA GOMOKU -> CORTAR Y PEGAR EN: gomoku.js      ✂️
// ✂️ ========================================================= ✂️

/**
 * Evalúa el tablero de Gomoku (15x15) buscando 5 fichas seguidas en cualquier dirección.
 * @param {Array} b - Array con el estado de las 225 casillas.
 * @returns {Object|null} Devuelve {p: jugadorGanador, line: [casillas]} o null/empate.
 */
function checkGomokuWin(b) {
    const dirs = [[0,1], [1,0], [1,1], [1,-1]];
    for(let r=0; r<15; r++) {
        for(let c=0; c<15; c++) {
            let p = b[r*15+c]; if(p === 0) continue;
            for(let [dr, dc] of dirs) {
                let count = 1;
                let line = [r*15+c];
                for(let step=1; step<5; step++) {
                    let nr = r + dr*step, nc = c + dc*step;
                    if(nr>=0 && nr<15 && nc>=0 && nc<15 && b[nr*15+nc] === p) {
                        count++;
                        line.push(nr*15+nc);
                    } else break;
                }
                if(count === 5) return { p: p, line: line };
            }
        }
    } return b.includes(0) ? null : { p: -1, line: [] };
}

// ✂️ ========================================================= ✂️
// ✂️ FIN LÓGICA GOMOKU                                         ✂️
// ✂️ ========================================================= ✂️



