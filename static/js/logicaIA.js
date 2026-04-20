// Nombre: logicaIA.js
// Ubicación / Location: static/js/

// ==========================================
// [MÓDULO: AUDIO] - SINTETIZADOR DE SONIDO (Web Audio API)
// [AUDIO MODULE] - SOUND SYNTHESIZER
// ==========================================
window.playMoveSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Tipo de onda que simula madera/plástico (un "Pop" suave)
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) { console.warn("Audio desactivado o no soportado"); }
};

// ==========================================
// [MÓDULO: AI MONOLÍTICO] - CEREBRO DE LA PC / PC BRAIN
// ==========================================
window.makePCMove = () => {
    if (!window.currentGame || window.currentGame.status !== 'playing' || window.currentGame.currentLocalTurn !== 2) return;
    
    let type = window.currentGame.gameType; 
    let state = window.currentGame.gameState; 
    let pNum = 2; 
    let chosenIndex = -1;
    let difficulty = window.currentGame.difficulty || 'normal';

    // SISTEMA DE DIFICULTAD
    let probabilidadError = 0;
    if (difficulty === 'facil') probabilidadError = 0.60; 
    if (difficulty === 'normal') probabilidadError = 0.15; 
    if (difficulty === 'dificil') probabilidadError = 0.0; 
    
    let cometerError = Math.random() < probabilidadError;

    if (type === 'gato') {
        let win = typeof findWinningMoveGato === 'function' ? findWinningMoveGato(state.board, 2) : -1;
        let block = typeof findWinningMoveGato === 'function' ? findWinningMoveGato(state.board, 1) : -1;
        let empty = [];
        state.board.forEach((c, i) => { if(c === 0) empty.push(i); });
        
        if (!cometerError && win !== -1) chosenIndex = win;
        else if (!cometerError && block !== -1) chosenIndex = block;
        else if (!cometerError && state.board[4] === 0) chosenIndex = 4; 
        else if (empty.length > 0) chosenIndex = empty[Math.floor(Math.random() * empty.length)];
    } 
    else if (type === '4linea') {
        let bestCol = -1;
        let validCols = [];
        for(let c=0; c<7; c++) { if(state.board[c] === 0) validCols.push(c); }
        
        if (!cometerError && typeof getC4DropRow === 'function' && typeof checkC4Win === 'function') {
            for(let c of validCols) {
                let r = getC4DropRow(state.board, c);
                if(r !== -1) {
                    let tempBoard = [...state.board]; tempBoard[r*7+c] = 2;
                    let res = checkC4Win(tempBoard);
                    if(res && res.p === 2) { bestCol = c; break; }
                }
            }
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
        
        if(bestCol !== -1) chosenIndex = bestCol;
        else if(validCols.length > 0) chosenIndex = validCols[Math.floor(Math.random() * validCols.length)];
    } 
    else if (type === 'gomoku') {
        let winIndex = -1; let blockIndex = -1;
        let candidates = []; let empty = [];
        state.board.forEach((c, i) => { if(c === 0) empty.push(i); });
        
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
        
        if(candidates.length === 0 && empty.length > 0) candidates.push(112); 
        
        if (!cometerError && typeof checkGomokuWin === 'function') {
            for(let i of candidates) {
                let tempBoard = [...state.board]; tempBoard[i] = 2;
                let res = checkGomokuWin(tempBoard); 
                if(res && res.p === 2) { winIndex = i; break; }
            }
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
            if(typeof getReversiFlips === 'function' && getReversiFlips(state.board, i, pNum).length > 0) validMoves.push(i);
        }
        if(validMoves.length > 0) {
            const corners = [0, 7, 56, 63];
            let cornerFound = validMoves.find(m => corners.includes(m));
            if(!cometerError && cornerFound !== undefined) chosenIndex = cornerFound;
            else chosenIndex = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else {
            window.currentGame.currentLocalTurn = 1;
            if(typeof window.renderGameBoard === 'function') window.renderGameBoard();
            return;
        }
    } 
    else if (type === 'damas') {
        if (typeof localSelection !== 'undefined' && localSelection.multiJumping && localSelection.selectedPiece !== null) {
            let jumps = localSelection.validMoves;
            if (jumps.length > 0) chosenIndex = jumps[Math.floor(Math.random() * jumps.length)];
        } else {
            let possibleMoves = []; let pieces = [];
            state.board.forEach((c, i) => { if(c === pNum || c === pNum + 2) pieces.push(i); });
            
            if (typeof getValidCheckersMoves === 'function') {
                pieces.forEach(p => {
                    let jumps = getValidCheckersMoves(state.board, p, pNum, true);
                    if(jumps.length > 0) {
                        jumps.forEach(j => possibleMoves.push({start: p, end: j, isJump: true}));
                    } else {
                        let normals = getValidCheckersMoves(state.board, p, pNum, false);
                        normals.forEach(n => possibleMoves.push({start: p, end: n, isJump: false}));
                    }
                });
            }
            
            let jumpsOnly = possibleMoves.filter(m => m.isJump);
            if(jumpsOnly.length > 0) possibleMoves = jumpsOnly;

            if(possibleMoves.length > 0) {
                let move;
                if (!cometerError && !possibleMoves[0].isJump) {
                    possibleMoves.sort((a, b) => {
                        let rA = Math.floor(a.end / 8), cA = a.end % 8;
                        let rB = Math.floor(b.end / 8), cB = b.end % 8;
                        let scoreA = rA + (cA === 0 || cA === 7 ? 1 : 0);
                        let scoreB = rB + (cB === 0 || cB === 7 ? 1 : 0);
                        return scoreB - scoreA;
                    });
                    move = possibleMoves[0];
                } else {
                    move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                }
                
                window.attemptMove(move.start, pNum, true); 
                setTimeout(() => window.attemptMove(move.end, pNum, true), 500); 
                return;
            }
        }
    }

    if (chosenIndex !== -1) {
        window.attemptMove(chosenIndex, pNum, true);
    }
};

// ==========================================
// [MÓDULO: LÓGICA DE TURNOS MONOLÍTICA] / TURN LOGIC
// ==========================================
window.attemptMove = (index, myPlayerNum, isMyTurn) => {
    if(!isMyTurn || window.currentGame.status !== 'playing' || (window.currentGame.mode === 'local' && window.currentGame.vsPC && window.currentGame.currentLocalTurn === 2 && myPlayerNum === 1)) {
        return; 
    }
    
    let state = JSON.parse(JSON.stringify(window.currentGame.gameState)); 
    let type = window.currentGame.gameType; let validMove = false; let endTurn = true; let flips = [];

    if(type === 'gato') {
        if(state.board[index] === 0) { state.board[index] = myPlayerNum; validMove = true; }
    } else if (type === '4linea') {
        for(let r=5; r>=0; r--) { 
            let i = r*7 + index; 
            if(state.board[i] === 0) { 
                state.board[i] = myPlayerNum; 
                validMove = true; 
                index = i; 
                break; 
            } 
        }
    } else if (type === 'gomoku') {
        if(state.board[index] === 0) { state.board[index] = myPlayerNum; validMove = true; }
    } else if (type === 'reversi') {
        if (typeof getReversiFlips === 'function') {
            flips = getReversiFlips(state.board, index, myPlayerNum);
            if (flips.length > 0) {
                state.board[index] = myPlayerNum; flips.forEach(i => state.board[i] = myPlayerNum); validMove = true;
            }
        }
    } else if (type === 'damas') {
        if (typeof localSelection !== 'undefined') {
            if (!localSelection.multiJumping && (state.board[index] === myPlayerNum || state.board[index] === myPlayerNum + 2)) {
                window.playMoveSound(); 
                localSelection.selectedPiece = index; 
                if (typeof getValidCheckersMoves === 'function') {
                    localSelection.validMoves = getValidCheckersMoves(state.board, index, myPlayerNum, false);
                }
                if (typeof window.renderGameBoard === 'function') window.renderGameBoard(); 
                return; 
            } else if (localSelection.selectedPiece !== null && localSelection.validMoves.includes(index)) {
                let isJump = Math.abs(Math.floor(localSelection.selectedPiece / 8) - Math.floor(index / 8)) === 2;
                if (isJump) { 
                    let r1 = Math.floor(localSelection.selectedPiece / 8), c1 = localSelection.selectedPiece % 8; let r2 = Math.floor(index / 8), c2 = index % 8;
                    state.board[((r1 + r2) / 2) * 8 + ((c1 + c2) / 2)] = 0; 
                }
                state.board[index] = state.board[localSelection.selectedPiece]; state.board[localSelection.selectedPiece] = 0;
                let promoted = false; 
                if (myPlayerNum === 1 && Math.floor(index / 8) === 0 && state.board[index] === 1) { state.board[index] = 3; promoted = true; }
                if (myPlayerNum === 2 && Math.floor(index / 8) === 7 && state.board[index] === 2) { state.board[index] = 4; promoted = true; }
                if (isJump && !promoted) {
                    let furtherJumps = typeof getValidCheckersMoves === 'function' ? getValidCheckersMoves(state.board, index, myPlayerNum, true) : [];
                    if (furtherJumps.length > 0) { localSelection.selectedPiece = index; localSelection.validMoves = furtherJumps; localSelection.multiJumping = true; endTurn = false; validMove = true; } else { window.resetSelection(); validMove = true; }
                } else { window.resetSelection(); validMove = true; }
            }
        }
    }

    if(validMove) {
        window.playMoveSound();

        let winnerNum = 0;
        let winningLine = [];

        if(type === 'gato') {
            let res = typeof checkTicTacToeWin === 'function' ? checkTicTacToeWin(state.board) : null;
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === '4linea') { 
            let res = typeof checkC4Win === 'function' ? checkC4Win(state.board) : null;
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === 'gomoku') { 
            let res = typeof checkGomokuWin === 'function' ? checkGomokuWin(state.board) : null;
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === 'reversi') {
            if (endTurn) {
                let nextP = myPlayerNum === 1 ? 2 : 1; let nextHasMoves = false; let myHasMoves = false;
                for(let i=0; i<64; i++) {
                    if (state.board[i] === 0 && typeof getReversiFlips === 'function') {
                        if (getReversiFlips(state.board, i, nextP).length > 0) nextHasMoves = true;
                        if (getReversiFlips(state.board, i, myPlayerNum).length > 0) myHasMoves = true;
                    }
                }
                if (!nextHasMoves) {
                    if (!myHasMoves) { 
                        let p1 = state.board.filter(c=>c===1).length; let p2 = state.board.filter(c=>c===2).length;
                        winnerNum = p1 > p2 ? 1 : (p2 > p1 ? 2 : -1);
                        winningLine = winnerNum === 1 ? state.board.map((c, i) => c === 1 ? i : -1).filter(i => i !== -1) : (winnerNum === 2 ? state.board.map((c, i) => c === 2 ? i : -1).filter(i => i !== -1) : []);
                    } else { endTurn = false; } 
                }
            }
        }
        else if (type === 'damas') {
            let p1 = state.board.filter(p => p===1 || p===3).length; let p2 = state.board.filter(p => p===2 || p===4).length;
            if(p1 === 0) { winnerNum = 2; winningLine = state.board.map((c, i) => c === 2 || c === 4 ? i : -1).filter(i => i !== -1); }
            else if(p2 === 0) { winnerNum = 1; winningLine = state.board.map((c, i) => c === 1 || c === 3 ? i : -1).filter(i => i !== -1); }
            else if (endTurn) {
                let nextP = myPlayerNum === 1 ? 2 : 1;
                let nextHasMoves = false;
                for(let i=0; i<64; i++) {
                    if ((state.board[i] === nextP || state.board[i] === nextP + 2) && typeof getValidCheckersMoves === 'function') {
                        if (getValidCheckersMoves(state.board, i, nextP, true).length > 0 || 
                            getValidCheckersMoves(state.board, i, nextP, false).length > 0) {
                            nextHasMoves = true;
                            break;
                        }
                    }
                }
                if (!nextHasMoves) {
                    winnerNum = myPlayerNum;
                    winningLine = state.board.map((c, i) => c === myPlayerNum || c === myPlayerNum + 2 ? i : -1).filter(i => i !== -1);
                }
            }
        }

        if (window.currentGame.mode === 'local') {
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) window.currentGame.currentLocalTurn = window.currentGame.currentLocalTurn === 1 ? 2 : 1;
            if (winnerNum !== 0) {
                window.currentGame.winningLine = winningLine;
                window.handleGameOverResult(winnerNum);
            }
            
            if (typeof window.renderGameBoard === 'function') window.renderGameBoard();

            if (window.currentGame.vsPC && window.currentGame.currentLocalTurn === 2 && window.currentGame.status === 'playing') {
                let delay = endTurn ? 800 : 500; 
                setTimeout(window.makePCMove, delay);
            }
        } else if (window.currentGame.mode === 'multi') {
            if (typeof socket !== 'undefined') {
                socket.emit('make_move', { 
                    room: window.currentGame.roomId, 
                    gameState: state, 
                    winnerNum: winnerNum, 
                    endTurn: endTurn, 
                    winningLine: winningLine,
                    lastMoveIndex: index 
                });
            }
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) { window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1; }
            if (winnerNum !== 0) {
                window.currentGame.winningLine = winningLine;
                window.handleGameOverResult(winnerNum);
            }
            if (typeof window.renderGameBoard === 'function') window.renderGameBoard();
        }
    }
};

window.resetSelection = () => { 
    if (typeof localSelection !== 'undefined') {
        localSelection = { selectedPiece: null, validMoves: [], multiJumping: false }; 
    }
};

window.handleGameOverResult = (winnerNum) => {
    window.currentGame.status = 'finished';
    window.currentGame.winnerNum = winnerNum; 
    
    let modalHeader = document.getElementById('goHeader');
    let msgElement = document.getElementById('goMessage');

    if(winnerNum === -1) {
        if(modalHeader) modalHeader.className = "modal-header border-bottom-0 justify-content-center text-warning";
        if (msgElement) {
            msgElement.innerText = "¡Ha sido un Empate!";
            msgElement.style.display = "block";
        }
    } else {
        if(modalHeader) modalHeader.className = "modal-header border-bottom-0 justify-content-center text-info";
        if (msgElement) {
            msgElement.style.display = "none";
        }
    }

    let pcStatsContainer = document.getElementById('pcStatsContainer');
    if (window.currentGame.mode === 'local' && window.currentGame.vsPC) {
        let wins = parseInt(localStorage.getItem('pc_wins') || '0');
        let losses = parseInt(localStorage.getItem('pc_losses') || '0');
        let draws = parseInt(localStorage.getItem('pc_draws') || '0');

        if (winnerNum === 1) wins++;
        else if (winnerNum === 2) losses++;
        else if (winnerNum === -1) draws++;

        localStorage.setItem('pc_wins', wins);
        localStorage.setItem('pc_losses', losses);
        localStorage.setItem('pc_draws', draws);

        let winEl = document.getElementById('pcWinsDisplay');
        let lossEl = document.getElementById('pcLossesDisplay');
        let drawEl = document.getElementById('pcDrawsDisplay');
        
        if(winEl) winEl.innerText = wins;
        if(lossEl) lossEl.innerText = losses;
        if(drawEl) drawEl.innerText = draws;
        
        if (pcStatsContainer) pcStatsContainer.style.display = 'block';
    } else {
        if (pcStatsContainer) pcStatsContainer.style.display = 'none';
    }

    let btnStats = document.getElementById('btnPostGameStats');
    if (btnStats) {
        if (window.currentGame.mode === 'multi' || (window.currentGame.mode === 'local' && window.currentGame.vsPC)) {
            btnStats.style.display = 'inline-block';
        } else {
            btnStats.style.display = 'none';
        }
    }

    // 🚀 SOLUCIÓN INFALIBLE DE MODAL: Obligamos al DOM a abrirlo sin importar el caché o variables globales
    let goModalEl = document.getElementById('gameOverModal');
    if(goModalEl) {
        try {
            let bsModal = bootstrap.Modal.getInstance(goModalEl) || new bootstrap.Modal(goModalEl);
            bsModal.show();
        } catch(e) {
            console.error("Fallo al forzar el Modal de fin de partida:", e);
        }
        
        setTimeout(() => {
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            goModalEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 150);
    }
};

window.confirmSurrender = () => { if(confirm("¿Estás seguro de que deseas abandonar la partida actual?")) { window.closeGameOver(); } };

window.closeGameOver = () => { 
    // 🚀 FIX: Forzar el cierre directamente del DOM
    let goModalEl = document.getElementById('gameOverModal');
    if (goModalEl) {
        try {
            let bsModal = bootstrap.Modal.getInstance(goModalEl);
            if(bsModal) bsModal.hide();
        } catch(e){}
    }
    
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    window.currentGame = null; 
    let gameView = document.getElementById('game-view');
    let lobbyView = document.getElementById('lobby-view');
    if(gameView) gameView.style.display = 'none'; 
    if(lobbyView) lobbyView.style.display = 'flex'; 
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// [MÓDULO: GAME_CORE] Escucha los movimientos recibidos del servidor para juego Online
if (typeof socket !== 'undefined') {
    socket.on('update_board', (data) => {
        if (window.currentGame && window.currentGame.mode === 'multi') {
            window.currentGame.gameState = data.gameState;
            
            if (data.lastMoveIndex !== undefined && typeof window.playMoveSound === 'function') window.playMoveSound();

            if (data.endTurn && data.winnerNum === 0) { window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1; }
            if (data.winnerNum !== 0) {
                window.currentGame.winningLine = data.winningLine || [];
            }
            
            if (data.winnerNum !== 0 && typeof window.handleGameOverResult === 'function') {
                window.handleGameOverResult(data.winnerNum);
            }
            
            if (typeof window.renderGameBoard === 'function') window.renderGameBoard(); 
        }
    });

    socket.on('game_started', (data) => {
        try {
            if (typeof Swal !== 'undefined') { Swal.close(); }
            else if (typeof swal !== 'undefined') { swal.close(); }
            
            if (typeof selectGameModalInst !== 'undefined' && selectGameModalInst) selectGameModalInst.hide();
            if (typeof playersModalInst !== 'undefined' && playersModalInst) playersModalInst.hide();
            if (typeof pcConfigModalInst !== 'undefined' && pcConfigModalInst) pcConfigModalInst.hide();
            
            let overlay = document.getElementById('retoOverlay');
            if (overlay) overlay.style.display = 'none';
            
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        } catch (e) {
            console.error("Error limpiando la interfaz:", e);
        }

        window.currentGame = { mode: 'multi', gameType: data.gameType, status: 'playing', roomId: data.roomId, turn: 1, myPlayerNum: data.myPlayerNum, opponent: data.opponent };
        window.currentGame.gameState = typeof getInitialState === 'function' ? getInitialState(data.gameType) : { board: Array(64).fill(0) };
        
        let lobbyView = document.getElementById('lobby-view');
        let gameView = document.getElementById('game-view');
        if (lobbyView) lobbyView.style.display = 'none';
        if (gameView) gameView.style.display = 'block';
        
        let btnStats = document.getElementById('btnPostGameStats');
        if (btnStats) btnStats.style.display = 'none';
        
        if (typeof window.renderGameBoard === 'function') window.renderGameBoard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}