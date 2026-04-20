// Nombre: board_render.js
// Ubicación: static/js/
// Función: Motor de dibujado del tablero de juego. Convierte el JSON al DOM.

window.renderGameBoard = () => {
    if(!window.currentGame) return;

    // 🚀 FIX: Limpieza de modales al iniciar/reanudar el juego usando la referencia global
    if (window.currentGame.status === 'playing') {
        if (window.bsGameOverModal) window.bsGameOverModal.hide();
        try {
            ['waitingModal', 'waitingChallengerModal', 'abandonModal'].forEach(id => {
                let el = document.getElementById(id); 
                if (el) { 
                    let inst = bootstrap.Modal.getInstance(el); 
                    if (inst) inst.hide(); 
                }
            });
            if (typeof Swal !== 'undefined') Swal.close(); 
            if (typeof swal !== 'undefined') swal.close();
            
            document.body.classList.remove('modal-open'); 
            document.body.style.overflow = ''; 
            document.body.style.paddingRight = '';
            document.querySelectorAll('.modal-backdrop, .swal2-container').forEach(el => el.remove());
        } catch (e) {}
    }

    const boardDiv = document.getElementById('gameBoard');
    const type = window.currentGame.gameType; 
    const state = window.currentGame.gameState;
    
    // Inyectar CSS de animaciones y escudos geométricos dinámicamente si no existe
    if (!document.getElementById('smoothAnimations')) {
        const style = document.createElement('style');
        style.id = 'smoothAnimations';
        style.innerHTML = `
            .game-board .cell { transition: background-color 0.3s ease; }
            .new-piece-anim {
                animation: dropIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .flip-anim {
                animation: flipIn 0.4s ease-in-out forwards;
            }
            @keyframes dropIn {
                0% { transform: scale(0.1) translateY(-20px); opacity: 0; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes flipIn {
                0% { transform: rotateY(90deg) scale(1.1); }
                100% { transform: rotateY(0deg) scale(1); }
            }
            
            /* 🔥 EFECTOS GLOW PARA TEXTO DE VICTORIA Y DERROTA */
            .win-text-effect {
                color: #ffd700 !important;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6) !important;
                font-size: 1.25rem;
                font-weight: 800;
                margin-top: 0.5rem;
            }
            .lose-text-effect {
                color: #ff4d4d !important;
                text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.6) !important;
                font-size: 1.25rem;
                font-weight: 800;
                margin-top: 0.5rem;
            }

            /* 🚀 FIX NUCLEAR DAMAS: EVITAR COLAPSO DE CELDAS VACÍAS Y DEFORMACIÓN DEL TABLERO */
            .grid-8x8 {
                display: grid !important;
                grid-template-columns: repeat(8, 1fr) !important;
                grid-template-rows: repeat(8, 1fr) !important; /* Fuerza 8 filas perfectamente iguales */
                aspect-ratio: 1 / 1 !important; /* Fuerza que el tablero sea un CUADRADO perfecto */
                width: 100% !important;
            }
            .grid-8x8 .cell {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                aspect-ratio: 1 / 1 !important; /* Cada celda es cuadrada obligatoriamente, vacía o no */
                padding: 0 !important;
                margin: 0 !important;
                position: relative !important;
            }
            .grid-8x8 .chk-piece {
                width: 80% !important;
                height: 80% !important;
                margin: 0 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
            }
        `;
        document.head.appendChild(style);
    }

    let gameName = type === 'gato' ? 'Gato' : (type === '4linea' ? '4 en Línea' : (type === 'damas' ? 'Damas' : (type === 'reversi' ? 'Reversi' : 'Gomoku')));
    if(window.currentGame.mode === 'local' && window.currentGame.vsPC) {
        gameName += ` vs PC (${window.currentGame.difficulty.toUpperCase()})`;
    }
    document.getElementById('gameTitle').innerText = gameName;
    
    let isMyTurn, myPlayerNum, indicatorText, indicatorClass;
    
    // Clase base para contraste con el fondo oscuro (solo para los turnos normales)
    let baseTextClass = "text-white fw-bold px-4 py-2 rounded-pill shadow-sm border border-secondary bg-dark bg-opacity-75";

    // LÓGICA DEL TEXTO CENTRAL Y ADORNOS DE VICTORIA/DERROTA
    if (window.currentGame.status === 'finished') {
        isMyTurn = false;
        let wNum = window.currentGame.winnerNum;
        
        if (wNum === -1) {
            indicatorText = "¡Ha sido un Empate!";
            indicatorClass = "text-warning fw-bold fs-5";
        } else if (wNum !== undefined) {
            
            // Si es multijugador, usamos los NOMBRES reales en lugar de colores
            if (window.currentGame.mode === 'multi') {
                let myName = window.CURRENT_USERNAME || "Jugador";
                let oppName = window.currentGame.opponent || "Oponente";

                if (wNum === window.currentGame.myPlayerNum) {
                    indicatorText = `¡Felicidades ${myName}! Has ganado la partida.`;
                    indicatorClass = "win-text-effect";
                    
                    if (!window.currentGame.confettiFired && typeof confetti === 'function') {
                        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 1060 });
                        window.currentGame.confettiFired = true;
                    }
                } else {
                    indicatorText = `¡Has perdido la partida contra ${oppName}!`;
                    indicatorClass = "lose-text-effect";
                }
            } else if (window.currentGame.mode === 'local') {
                let colorGanador = (type === 'reversi' || type === 'gomoku') ? (wNum === 1 ? 'Negras' : 'Blancas') : (wNum === 1 ? 'Rojas' : 'Azules');
                
                if (window.currentGame.vsPC) {
                    if (wNum === 1) {
                        indicatorText = `¡Felicidades! Has ganado la partida.`;
                        indicatorClass = "win-text-effect";
                        if (!window.currentGame.confettiFired && typeof confetti === 'function') {
                            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 1060 });
                            window.currentGame.confettiFired = true;
                        }
                    } else {
                        indicatorText = `¡Has perdido la partida contra la PC!`;
                        indicatorClass = "lose-text-effect";
                    }
                } else {
                    indicatorText = `¡Felicidades! Jugador ${wNum} (Fichas ${colorGanador}) ha ganado.`;
                    indicatorClass = "win-text-effect";
                    if (!window.currentGame.confettiFired && typeof confetti === 'function') {
                        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 1060 });
                        window.currentGame.confettiFired = true;
                    }
                }
            }
        } else {
            indicatorText = "¡Juego Terminado!";
            indicatorClass = "text-light fw-bold";
        }
    } else {
        if (window.currentGame.mode === 'local') {
            const j = window.currentGame.currentLocalTurn; 
            isMyTurn = true; 
            myPlayerNum = j;
            
            if (window.currentGame.vsPC && j === 2) {
                indicatorText = "Pensando (Turno de la PC)...";
                indicatorClass = baseTextClass; 
                isMyTurn = false; 
            } else {
                indicatorText = type==='reversi'||type==='gomoku' ? `Tu Turno (${j===1?'NEGRAS':'BLANCAS'})` : `Tu Turno (${j===1?'ROJAS':'AZULES'})`;
                indicatorClass = j === 1 ? (type==='reversi'||type==='gomoku'?"text-dark fw-bold bg-light px-4 py-2 rounded-pill shadow-sm":"text-white fw-bold bg-danger px-4 py-2 rounded-pill shadow-sm") : (type==='reversi'||type==='gomoku'?"text-white fw-bold bg-dark px-4 py-2 rounded-pill shadow-sm":"text-dark fw-bold bg-info px-4 py-2 rounded-pill shadow-sm");
            }
        } else if (window.currentGame.mode === 'multi') {
            myPlayerNum = window.currentGame.myPlayerNum; isMyTurn = (window.currentGame.turn === myPlayerNum);
            if (isMyTurn) {
                indicatorText = "¡Es tu turno!";
                indicatorClass = myPlayerNum === 1 ? (type==='reversi'||type==='gomoku'?"text-dark fw-bold bg-light px-4 py-2 rounded-pill shadow-sm":"text-white fw-bold bg-danger px-4 py-2 rounded-pill shadow-sm") : (type==='reversi'||type==='gomoku'?"text-white fw-bold bg-dark px-4 py-2 rounded-pill shadow-sm":"text-dark fw-bold bg-info px-4 py-2 rounded-pill shadow-sm");
            } else {
                indicatorText = `Turno de ${window.currentGame.opponent || 'tu oponente'}...`; 
                indicatorClass = baseTextClass; 
            }
        }
    }

    let indicator = document.getElementById('turnIndicator');
    if(indicator) { indicator.innerText = indicatorText; indicator.className = indicatorClass; }
    
    let btnAbandonar = document.getElementById('btnAbandonar');
    if(btnAbandonar) {
        if(window.currentGame.status === 'finished') {
            btnAbandonar.innerText = "Volver al Menú";
            btnAbandonar.className = "btn btn-sm btn-success rounded-pill px-3 shadow";
            btnAbandonar.onclick = window.closeGameOver;
        } else {
            btnAbandonar.innerText = "Abandonar";
            btnAbandonar.className = "btn btn-sm btn-outline-danger rounded-pill px-3";
            btnAbandonar.onclick = window.confirmSurrender;
        }
    }

    boardDiv.innerHTML = '';
    
    if(type === 'gato') boardDiv.className = 'game-board glass-panel grid-3x3';
    else if(type === '4linea') boardDiv.className = 'game-board glass-panel grid-7x6';
    else if(type === 'damas') boardDiv.className = 'game-board glass-panel grid-8x8';
    else if(type === 'reversi') boardDiv.className = 'game-board glass-panel grid-8x8-rev';
    else if(type === 'gomoku') boardDiv.className = 'game-board glass-panel grid-15x15';

    // Renderizado individual de casillas y fichas
    if(type === 'gato') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell shadow-sm'; d.innerText = cell === 1 ? 'X' : cell === 2 ? 'O' : '';
            if(cell === 1) d.style.color = '#ff0055'; if(cell === 2) d.style.color = '#0dcaf0';
            if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) d.classList.add('winning-piece');
            d.onclick = () => window.attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    } 
    else if (type === '4linea') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell bg-primary p-1';
            let circle = document.createElement('div'); circle.className = `c4-cell ${cell===1?'c4-p1':cell===2?'c4-p2':''}`;
            if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) circle.classList.add('winning-piece');
            d.appendChild(circle); d.onclick = () => window.attemptMove(i % 7, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    } 
    else if (type === 'gomoku') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell';
            if (cell !== 0) { 
                let piece = document.createElement('div'); piece.className = `gmk-piece ${cell===1?'gmk-p1':'gmk-p2'}`; 
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece); 
            }
            d.onclick = () => window.attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
    else if (type === 'reversi') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell';
            if (cell !== 0) {
                let piece = document.createElement('div'); piece.className = `rev-piece ${cell===1?'rev-p1':'rev-p2'}`; 
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece);
            } else if (isMyTurn && typeof getReversiFlips === 'function' && getReversiFlips(state.board, i, myPlayerNum).length > 0) {
                d.classList.add('valid-move'); d.style.cursor = 'pointer';
            }
            d.onclick = () => window.attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
    else if (type === 'damas') {
        state.board.forEach((cell, i) => {
            let row = Math.floor(i/8); let col = i%8; 
            let d = document.createElement('div');
            let isDark = (row+col)%2 !== 0; 
            d.className = `cell ${isDark ? 'chk-dark' : 'chk-light'}`;

            let validMoves = (typeof window.localSelection !== 'undefined' && window.localSelection) ? window.localSelection.validMoves : [];
            let selPiece = (typeof window.localSelection !== 'undefined' && window.localSelection) ? window.localSelection.selectedPiece : null;
            
            let isPieceSelected = selPiece !== null && selPiece !== undefined && selPiece !== -1;

            // 🚀 FIX: Delegar responsabilidad absoluta al archivo indicador.js
            if (isMyTurn && isPieceSelected && cell === 0 && validMoves.includes(i)) { 
                d.style.cursor = 'pointer'; 
                if (typeof window.IndicadorDamas !== 'undefined') {
                    window.IndicadorDamas.dibujar(d);
                }
            }
            
            if(cell !== 0) {
                let piece = document.createElement('div'); 
                piece.className = `chk-piece ${cell===1 || cell===3 ? 'chk-p1' : 'chk-p2'}`;
                
                // 🚫 SE ELIMINÓ 'piece.style.position' Y 'piece.style.zIndex' PARA QUE NO ROMPA LA GRILLA DE FLEXBOX
                if(cell>2) piece.innerText = '♚'; 
                
                if(isMyTurn && isPieceSelected && selPiece === i) {
                    piece.style.transform = "scale(1.15)";
                    piece.style.boxShadow = "0 0 15px #ffd700"; 
                    piece.style.borderRadius = "50%";
                }
                
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) {
                    piece.classList.add('winning-piece');
                }
                d.appendChild(piece);
            }
            d.onclick = () => window.attemptMove(i, myPlayerNum, isMyTurn); 
            boardDiv.appendChild(d);
        });
    }
};