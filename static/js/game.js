// Nombre: game.js
// Ubicación: static/js/

// ==========================================
// [MÓDULO: GAME_CORE] - REGLAS, TABLERO Y LÓGICA PRINCIPAL DEL JUEGO
// ==========================================
window.currentGame = null; 
let localSelection = { selectedPiece: null, validMoves: [], multiJumping: false };
let bsGameOverModal;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('gameOverModal')) bsGameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
});

/**
 * [MÓDULO: GAME_CORE]
 * Genera el estado inicial del tablero (array de ceros, o con fichas iniciales) dependiendo del juego.
 * @param {string} type - Tipo de juego ('gato', '4linea', 'damas', 'reversi', 'gomoku').
 * @returns {Object} Objeto con la propiedad board conteniendo el array inicial.
 */
function getInitialState(type) {
    if(type === 'gato') return { board: Array(9).fill(0) };
    if(type === '4linea') return { board: Array(42).fill(0) }; 
    if(type === 'gomoku') return { board: Array(225).fill(0) }; // 15x15
    if(type === 'reversi') {
        let b = Array(64).fill(0);
        b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; // Centro inicial Reversi
        return { board: b };
    }
    if(type === 'damas') {
        let b = Array(64).fill(0);
        for(let i=0; i<64; i++) {
            let row = Math.floor(i/8); let col = i%8;
            if((row+col)%2 !== 0) { if(row < 3) b[i] = 2; else if(row > 4) b[i] = 1; }
        }
        return { board: b };
    }
    return {};
}

// ==========================================
// [MÓDULO: UI] - MODAL AVANZADO DE CONFIGURACIÓN PC
// ==========================================
let pendingGameTypeForPC = null;
let pcConfigModalInst = null;
window.tempPCConfig = { diff: 'normal', starter: 1 };

/**
 * Inyecta y muestra un modal interactivo para elegir dificultad y quién inicia.
 * @param {string} gameType - El juego que se va a iniciar.
 */
function showPCConfigModal(gameType) {
    pendingGameTypeForPC = gameType;
    window.tempPCConfig = { diff: 'normal', starter: 1 }; // Valores por defecto
    
    let modalEl = document.getElementById('pcConfigModal');
    
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="pcConfigModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-info text-center shadow-lg" style="background: rgba(20, 20, 30, 0.95); backdrop-filter: blur(12px);">
                    <div class="modal-header border-secondary justify-content-center">
                        <h5 class="modal-title text-info fw-bold"><i class="bi bi-gear-fill"></i> Configurar Partida vs PC</h5>
                    </div>
                    <div class="modal-body py-4 text-start px-4">
                        
                        <!-- Sección 1: Dificultad -->
                        <h6 class="text-light mb-3 border-bottom border-secondary pb-2"><i class="bi bi-cpu"></i> 1. Nivel de Inteligencia</h6>
                        <div class="d-flex justify-content-between gap-2 mb-4">
                            <button id="btnDiffFacil" class="btn flex-fill rounded-pill shadow-sm btn-outline-success" onclick="setTempDiff('facil')">Fácil</button>
                            <button id="btnDiffNormal" class="btn flex-fill rounded-pill shadow-sm btn-warning fw-bold text-dark" onclick="setTempDiff('normal')">Normal</button>
                            <button id="btnDiffDificil" class="btn flex-fill rounded-pill shadow-sm btn-outline-danger" onclick="setTempDiff('dificil')">Difícil</button>
                        </div>

                        <!-- Sección 2: Quién Inicia -->
                        <h6 class="text-light mb-3 border-bottom border-secondary pb-2"><i class="bi bi-play-circle"></i> 2. ¿Quién inicia el juego?</h6>
                        <div class="d-flex justify-content-between gap-2 mb-4">
                            <button id="btnStartYo" class="btn flex-fill rounded-pill shadow-sm btn-info fw-bold text-dark" onclick="setTempStarter(1)">Empiezo Yo</button>
                            <button id="btnStartAleatorio" class="btn flex-fill rounded-pill shadow-sm btn-outline-light" onclick="setTempStarter(0)"><i class="bi bi-dice-5"></i> Al Azar</button>
                            <button id="btnStartPC" class="btn flex-fill rounded-pill shadow-sm btn-outline-danger" onclick="setTempStarter(2)">Empieza PC</button>
                        </div>

                    </div>
                    <div class="modal-footer border-secondary justify-content-between">
                        <button type="button" class="btn btn-sm btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-lg btn-info rounded-pill px-5 fw-bold shadow-sm" onclick="confirmPCConfig()">¡A Jugar!</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('pcConfigModal');
        pcConfigModalInst = new bootstrap.Modal(modalEl);
    }
    
    // Resetear las clases visuales al abrir el modal
    setTempDiff('normal');
    setTempStarter(1);
    pcConfigModalInst.show();
}

/**
 * Funciones para manejar los estilos visuales de los botones en el Modal de Configuración
 */
window.setTempDiff = (diff) => {
    window.tempPCConfig.diff = diff;
    document.getElementById('btnDiffFacil').className = `btn flex-fill rounded-pill shadow-sm ${diff==='facil' ? 'btn-success fw-bold text-white' : 'btn-outline-success'}`;
    document.getElementById('btnDiffNormal').className = `btn flex-fill rounded-pill shadow-sm ${diff==='normal' ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning'}`;
    document.getElementById('btnDiffDificil').className = `btn flex-fill rounded-pill shadow-sm ${diff==='dificil' ? 'btn-danger fw-bold text-white' : 'btn-outline-danger'}`;
};

window.setTempStarter = (starter) => {
    window.tempPCConfig.starter = starter;
    document.getElementById('btnStartYo').className = `btn flex-fill rounded-pill shadow-sm ${starter===1 ? 'btn-info fw-bold text-dark' : 'btn-outline-info'}`;
    document.getElementById('btnStartAleatorio').className = `btn flex-fill rounded-pill shadow-sm ${starter===0 ? 'btn-light fw-bold text-dark' : 'btn-outline-light'}`;
    document.getElementById('btnStartPC').className = `btn flex-fill rounded-pill shadow-sm ${starter===2 ? 'btn-danger fw-bold text-white' : 'btn-outline-danger'}`;
};

window.confirmPCConfig = () => {
    if (pcConfigModalInst) pcConfigModalInst.hide();
    if (pendingGameTypeForPC) {
        let finalStarter = window.tempPCConfig.starter;
        
        // Si eligió "Al Azar", tiramos una moneda (1 o 2)
        if (finalStarter === 0) {
            finalStarter = Math.random() < 0.5 ? 1 : 2; 
        }
        
        startLocalGame(pendingGameTypeForPC, true, window.tempPCConfig.diff, finalStarter);
        pendingGameTypeForPC = null; 
    }
};

/**
 * [MÓDULO: GAME_CORE]
 * Inicializa y configura la variable global currentGame para una partida local (Humano o vs PC).
 * Transiciona la vista del lobby al tablero.
 * @param {string} type - Tipo de juego.
 * @param {boolean} vsPC - Indica si la partida será contra la Inteligencia Artificial.
 * @param {string} difficulty - Dificultad de la PC ('facil', 'normal', 'dificil'). Default: null.
 * @param {number} startingTurn - Jugador que inicia (1: Humano, 2: PC). Default: null.
 */
window.startLocalGame = (type, vsPC = false, difficulty = null, startingTurn = null) => {
    
    // Si es contra la PC y venimos directo del lobby sin configuración
    if (vsPC && difficulty === null) {
        
        // ¡Magia de Revancha!: Si apretamos "Volver a jugar", recordamos la config anterior
        // y de paso, intercambiamos quién empieza para que sea justo.
        if (window.currentGame && window.currentGame.vsPC && window.currentGame.difficulty) {
            difficulty = window.currentGame.difficulty;
            // Si yo empecé antes, ahora empieza la PC, y viceversa.
            startingTurn = window.currentGame.originalStartingTurn === 1 ? 2 : 1; 
        } else {
            // Es una partida totalmente nueva, mostramos el Panel de Configuración
            showPCConfigModal(type);
            return; // Detenemos aquí hasta que el jugador confirme
        }
    }

    let finalDifficulty = difficulty || 'normal';
    let finalStarter = startingTurn || 1; // Por defecto inicia el Humano (Jugador 1)

    window.currentGame = { 
        mode: 'local', 
        vsPC: vsPC, 
        difficulty: finalDifficulty, 
        originalStartingTurn: finalStarter, // <-- GUARDAMOS QUIÉN EMPEZÓ PARA LA REVANCHA
        gameType: type, 
        status: 'playing', 
        currentLocalTurn: finalStarter,     // <-- ASIGNAMOS EL TURNO INICIAL (1 o 2)
        gameState: getInitialState(type) 
    };
    
    document.getElementById('lobby-view').style.display = 'none'; 
    document.getElementById('game-view').style.display = 'block';
    
    let btnStats = document.getElementById('btnPostGameStats');
    if (btnStats) btnStats.style.display = 'none';
    
    renderGameBoard();
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    
    // ¡CRÍTICO! Si le configuramos el turno a la PC, tenemos que decirle que juegue inmediatamente
    if (vsPC && finalStarter === 2) {
        setTimeout(makePCMove, 800);
    }
};

/**
 * [MÓDULO: GAME_CORE]
 * Dibuja el tablero en pantalla iterando sobre el estado (window.currentGame.gameState.board).
 * Añade las clases CSS, las animaciones de victoria y los event listeners de clic a las casillas.
 */
window.renderGameBoard = () => {
    if(!window.currentGame) return;
    const boardDiv = document.getElementById('gameBoard');
    const type = window.currentGame.gameType; 
    const state = window.currentGame.gameState;
    
    // Nombres bonitos y Dificultad
    let gameName = type === 'gato' ? 'Gato' : (type === '4linea' ? '4 en Línea' : (type === 'damas' ? 'Damas' : (type === 'reversi' ? 'Reversi' : 'Gomoku')));
    if(window.currentGame.mode === 'local' && window.currentGame.vsPC) {
        gameName += ` vs PC (${window.currentGame.difficulty.toUpperCase()})`;
    }
    document.getElementById('gameTitle').innerText = gameName;
    
    let isMyTurn, myPlayerNum, indicatorText, indicatorClass;

    // LÓGICA DEL TEXTO CENTRAL: Si el juego terminó o sigue en curso
    if (window.currentGame.status === 'finished') {
        isMyTurn = false;
        let wNum = window.currentGame.winnerNum;
        
        if (wNum === -1) {
            indicatorText = "¡Ha sido un Empate!";
            indicatorClass = "text-warning fw-bold";
        } else if (wNum !== undefined) {
            let color = "";
            if (type === 'reversi' || type === 'gomoku') color = wNum === 1 ? 'NEGRO' : 'BLANCO';
            else color = wNum === 1 ? 'ROJO' : 'AZUL';
            
            if (window.currentGame.mode === 'multi') {
                if (wNum === window.currentGame.myPlayerNum) {
                    indicatorText = `¡Felicidades! (${color}) Ha Ganado.`;
                    indicatorClass = "win-text-effect";
                } else {
                    indicatorText = `¡${window.currentGame.opponent} (${color}) Ha Ganado!`;
                    indicatorClass = "lose-text-effect";
                }
            } else if (window.currentGame.mode === 'local') {
                if (window.currentGame.vsPC) {
                    if (wNum === 1) {
                        indicatorText = `¡Felicidades! (${color}) Ha Ganado.`;
                        indicatorClass = "win-text-effect";
                    } else {
                        indicatorText = `¡La PC (${color}) Ha Ganado!`;
                        indicatorClass = "lose-text-effect";
                    }
                } else {
                    // Local multiplayer (amigo contra amigo)
                    indicatorText = `¡Felicidades! Jugador ${wNum} (${color}) Ha Ganado.`;
                    indicatorClass = "win-text-effect";
                }
            }
        } else {
            indicatorText = "¡Juego Terminado!";
            indicatorClass = "text-light fw-bold";
        }
    } else {
        // El juego sigue en curso (Lógica Normal de Turnos)
        if (window.currentGame.mode === 'local') {
            const j = window.currentGame.currentLocalTurn; 
            isMyTurn = true; 
            myPlayerNum = j;
            
            // Bloquear tablero visualmente si es el turno de la PC
            if (window.currentGame.vsPC && j === 2) {
                indicatorText = "Pensando (Turno de la PC)...";
                indicatorClass = "text-muted";
                isMyTurn = false; 
            } else {
                indicatorText = type==='reversi'||type==='gomoku' ? `Turno: Jugador ${j} (${j===1?'NEGRO':'BLANCO'})` : `Turno: Jugador ${j} (${j===1?'ROJO':'AZUL'})`;
                indicatorClass = j === 1 ? (type==='reversi'||type==='gomoku'?"text-dark fw-bold bg-light px-3 rounded":"text-danger fw-bold") : (type==='reversi'||type==='gomoku'?"text-light fw-bold":"text-info fw-bold");
            }
        } else if (window.currentGame.mode === 'multi') {
            myPlayerNum = window.currentGame.myPlayerNum; isMyTurn = (window.currentGame.turn === myPlayerNum);
            if (isMyTurn) {
                indicatorText = "¡Es tu turno!";
                indicatorClass = myPlayerNum === 1 ? (type==='reversi'||type==='gomoku'?"text-dark fw-bold bg-light px-3 rounded":"text-danger fw-bold") : (type==='reversi'||type==='gomoku'?"text-light fw-bold":"text-info fw-bold");
            } else {
                indicatorText = `Turno de ${window.currentGame.opponent || 'tu oponente'}...`; indicatorClass = "text-muted";
            }
        }
    }

    // Inyectar el texto arriba del tablero
    let indicator = document.getElementById('turnIndicator');
    if(indicator) { indicator.innerText = indicatorText; indicator.className = indicatorClass; }
    
    // Cambiar botón superior dependiendo si el juego terminó
    let btnAbandonar = document.getElementById('btnAbandonar');
    if(btnAbandonar) {
        if(window.currentGame.status === 'finished') {
            btnAbandonar.innerText = "Volver al Menú";
            btnAbandonar.className = "btn btn-sm btn-success rounded-pill px-3 shadow";
            btnAbandonar.onclick = closeGameOver;
        } else {
            btnAbandonar.innerText = "Abandonar";
            btnAbandonar.className = "btn btn-sm btn-outline-danger rounded-pill px-3";
            btnAbandonar.onclick = confirmSurrender;
        }
    }

    boardDiv.innerHTML = '';
    
    // Estilos de tablero contenedor
    if(type === 'gato') boardDiv.className = 'game-board glass-panel grid-3x3';
    else if(type === '4linea') boardDiv.className = 'game-board glass-panel grid-7x6';
    else if(type === 'damas') boardDiv.className = 'game-board glass-panel grid-8x8';
    else if(type === 'reversi') boardDiv.className = 'game-board glass-panel grid-8x8-rev';
    else if(type === 'gomoku') boardDiv.className = 'game-board glass-panel grid-15x15';

    // Render Gato
    if(type === 'gato') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell shadow-sm'; d.innerText = cell === 1 ? 'X' : cell === 2 ? 'O' : '';
            if(cell === 1) d.style.color = '#ff0055'; if(cell === 2) d.style.color = '#0dcaf0';
            if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) d.classList.add('winning-piece');
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    } 
    // Render 4 en Línea
    else if (type === '4linea') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell bg-primary p-1';
            let circle = document.createElement('div'); circle.className = `c4-cell ${cell===1?'c4-p1':cell===2?'c4-p2':''}`;
            if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) circle.classList.add('winning-piece');
            d.appendChild(circle); d.onclick = () => attemptMove(i % 7, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    } 
    // Render Gomoku
    else if (type === 'gomoku') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell';
            if (cell !== 0) { 
                let piece = document.createElement('div'); piece.className = `gmk-piece ${cell===1?'gmk-p1':'gmk-p2'}`; 
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece); 
            }
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
    // Render Reversi
    else if (type === 'reversi') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell';
            if (cell !== 0) {
                let piece = document.createElement('div'); piece.className = `rev-piece ${cell===1?'rev-p1':'rev-p2'}`; 
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece);
            } else if (isMyTurn && getReversiFlips(state.board, i, myPlayerNum).length > 0) {
                // Pista de movimiento válido
                d.classList.add('valid-move'); d.style.cursor = 'pointer';
            }
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
    // Render Damas
    else if (type === 'damas') {
        state.board.forEach((cell, i) => {
            let row = Math.floor(i/8); let col = i%8; let d = document.createElement('div');
            let isDark = (row+col)%2 !== 0; d.className = `cell ${isDark ? 'chk-dark' : 'chk-light'}`;
            if (isMyTurn && localSelection.validMoves.includes(i)) { d.classList.add('valid-move'); d.style.cursor = 'pointer'; }
            if(cell !== 0) {
                let piece = document.createElement('div'); piece.className = `chk-piece ${cell===1 || cell===3 ? 'chk-p1' : 'chk-p2'}`;
                if(cell>2) piece.innerText = '♚'; 
                if(isMyTurn && localSelection.selectedPiece === i) piece.style.transform = "scale(1.15)";
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece);
            }
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
};

// ==========================================
// [MÓDULO: GAME_LOGIC] - LÓGICA INDIVIDUAL DE CADA JUEGO
// ==========================================


// ==========================================
// [MÓDULO: AI MONOLÍTICO] - CEREBRO DE LA PC
// NOTA: Una vez que separes las funciones de arriba, si deseas una modularización total, 
// puedes dividir el bloque 'if (type === ...)' de esta función y pasarlo a sus respectivos archivos.
// ==========================================

/**
 * CEREBRO DE LA PC. Es la Inteligencia Artificial de la aplicación.
 * Evalúa el tablero actual dependiendo del juego e invoca 'attemptMove' 
 * para ejecutar el movimiento decidido simulando un clic humano.
 * Usa heurística básica y evaluación predictiva de victoria/bloqueo de 1 nivel.
 */
window.makePCMove = () => {
    if (!window.currentGame || window.currentGame.status !== 'playing' || window.currentGame.currentLocalTurn !== 2) return;
    
    let type = window.currentGame.gameType; 
    let state = window.currentGame.gameState; 
    let pNum = 2; 
    let chosenIndex = -1;
    let difficulty = window.currentGame.difficulty || 'normal';

    // ==========================================
    // SISTEMA DE DIFICULTAD (Probabilidad de Error)
    // ==========================================
    let probabilidadError = 0;
    if (difficulty === 'facil') probabilidadError = 0.60; // 60% de hacer una jugada tonta
    if (difficulty === 'normal') probabilidadError = 0.15; // 15% de hacer una jugada tonta (más humano)
    if (difficulty === 'dificil') probabilidadError = 0.0; // 0% de error. Juega a ganar siempre.
    
    let cometerError = Math.random() < probabilidadError;

    if (type === 'gato') {
        let win = findWinningMoveGato(state.board, 2);
        let block = findWinningMoveGato(state.board, 1);
        
        let empty = [];
        state.board.forEach((c, i) => { if(c === 0) empty.push(i); });
        
        // Si no comete error, busca ganar o bloquear primero
        if (!cometerError && win !== -1) chosenIndex = win;
        else if (!cometerError && block !== -1) chosenIndex = block;
        else if (!cometerError && state.board[4] === 0) chosenIndex = 4; // Tomar el centro es la mejor estrategia
        else if (empty.length > 0) {
            // Jugada aleatoria
            chosenIndex = empty[Math.floor(Math.random() * empty.length)];
        }
    } 
    else if (type === '4linea') {
        let bestCol = -1;
        let validCols = [];
        for(let c=0; c<7; c++) { if(state.board[c] === 0) validCols.push(c); }
        
        if (!cometerError) {
            // 1. ¿Puede la PC ganar en el siguiente turno?
            for(let c of validCols) {
                let r = getC4DropRow(state.board, c);
                if(r !== -1) {
                    let tempBoard = [...state.board]; tempBoard[r*7+c] = 2;
                    let res = checkC4Win(tempBoard);
                    if(res && res.p === 2) { bestCol = c; break; }
                }
            }
            // 2. ¿Necesita bloquear al jugador?
            if(bestCol === -1) {
                for(let c of validCols) {
                    let r = getC4DropRow(state.board, c);
                    if(r !== -1) {
                        let tempBoard = [...state.board]; tempBoard[r*7+c] = 1;
                        let res = checkC4Win(tempBoard);
                        if(res && res.p === 1) { bestCol = c; break; }
                    }
                }
            }
        }
        
        if(bestCol !== -1) {
            chosenIndex = bestCol; // El índice horizontal servirá
        } else if(validCols.length > 0) {
            chosenIndex = validCols[Math.floor(Math.random() * validCols.length)];
        }
    } 
    else if (type === 'gomoku') {
        let winIndex = -1; let blockIndex = -1;
        let candidates = []; let empty = [];
        
        state.board.forEach((c, i) => { if(c === 0) empty.push(i); });
        
        // Optimización: Solo evaluar casillas adyacentes a las fichas existentes
        for(let i of empty) {
            let r = Math.floor(i/15), c = i%15;
            let hasNeighbor = false;
            for(let dr=-1; dr<=1; dr++){
                for(let dc=-1; dc<=1; dc++){
                    if(dr===0 && dc===0) continue;
                    let nr=r+dr, nc=c+dc;
                    if(nr>=0 && nr<15 && nc>=0 && nc<15 && state.board[nr*15+nc]!==0) hasNeighbor=true;
                }
            }
            if(hasNeighbor) candidates.push(i);
        }
        
        // Si el tablero está vacío, tomar el centro
        if(candidates.length === 0 && empty.length > 0) candidates.push(112); 
        
        if (!cometerError) {
            // 1. Buscar ganar
            for(let i of candidates) {
                let tempBoard = [...state.board]; tempBoard[i] = 2;
                let res = checkGomokuWin(tempBoard); 
                if(res && res.p === 2) { winIndex = i; break; }
            }
            // 2. Buscar bloquear
            if(winIndex === -1) {
                for(let i of candidates) {
                    let tempBoard = [...state.board]; tempBoard[i] = 1;
                    let res = checkGomokuWin(tempBoard); 
                    if(res && res.p === 1) { blockIndex = i; break; }
                }
            }
        }
        
        if(winIndex !== -1) chosenIndex = winIndex;
        else if(blockIndex !== -1) chosenIndex = blockIndex;
        else if(candidates.length > 0) chosenIndex = candidates[Math.floor(Math.random() * candidates.length)];
    } 
    else if (type === 'reversi') {
        let validMoves = [];
        for(let i=0; i<64; i++) {
            if(getReversiFlips(state.board, i, pNum).length > 0) validMoves.push(i);
        }
        if(validMoves.length > 0) {
            const corners = [0, 7, 56, 63];
            let cornerFound = validMoves.find(m => corners.includes(m));
            
            // Priorizar las esquinas si no está cometiendo errores
            if(!cometerError && cornerFound !== undefined) {
                chosenIndex = cornerFound;
            } else {
                chosenIndex = validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        } else {
            // La PC no tiene movimientos, pasa turno
            window.currentGame.currentLocalTurn = 1;
            renderGameBoard();
            return;
        }
    } 
    else if (type === 'damas') {
        // Si la PC está haciendo un salto múltiple
        if (localSelection.multiJumping && localSelection.selectedPiece !== null) {
            let jumps = localSelection.validMoves;
            if (jumps.length > 0) chosenIndex = jumps[Math.floor(Math.random() * jumps.length)];
        } else {
            let possibleMoves = [];
            let pieces = [];
            state.board.forEach((c, i) => { if(c === pNum || c === pNum + 2) pieces.push(i); });
            
            pieces.forEach(p => {
                let jumps = getValidCheckersMoves(state.board, p, pNum, true);
                if(jumps.length > 0) {
                    jumps.forEach(j => possibleMoves.push({start: p, end: j, isJump: true}));
                } else {
                    let normals = getValidCheckersMoves(state.board, p, pNum, false);
                    normals.forEach(n => possibleMoves.push({start: p, end: n, isJump: false}));
                }
            });
            
            // Obligar a saltar/comer si es posible
            let jumpsOnly = possibleMoves.filter(m => m.isJump);
            if(jumpsOnly.length > 0) possibleMoves = jumpsOnly;

            if(possibleMoves.length > 0) {
                let move;
                // IA Avanzada para Damas en Difícil: Prioriza moverse por las orillas (seguro) o avanzar hacia la coronación
                if (!cometerError && !possibleMoves[0].isJump) {
                    possibleMoves.sort((a, b) => {
                        let rA = Math.floor(a.end / 8), cA = a.end % 8;
                        let rB = Math.floor(b.end / 8), cB = b.end % 8;
                        let scoreA = rA + (cA === 0 || cA === 7 ? 1 : 0); // Fila + punto extra por estar en el borde
                        let scoreB = rB + (cB === 0 || cB === 7 ? 1 : 0);
                        return scoreB - scoreA; // Ordena de mayor a menor puntaje
                    });
                    move = possibleMoves[0]; // Selecciona la mejor opción de avance
                } else {
                    // Selecciona un movimiento al azar
                    move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                }
                
                attemptMove(move.start, pNum, true); // La PC selecciona la ficha visualmente
                setTimeout(() => attemptMove(move.end, pNum, true), 500); // 500ms después hace el movimiento
                return;
            }
        }
    }

    if (chosenIndex !== -1) {
        attemptMove(chosenIndex, pNum, true);
    }
};

