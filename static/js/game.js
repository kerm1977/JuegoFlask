// Nombre: game.js
// Ubicación: static/js/

// 🚀 FIX ANTI-CACHE: Interceptamos alertas viejas que puedan haber quedado en la memoria del celular
const originalAlert = window.alert;
window.alert = function(msg) {
    if (typeof msg === 'string' && (msg.includes('Esperando respuesta') || msg.includes('enviado a'))) {
        console.log('Alerta bloqueada por el sistema anti-caché:', msg);
        return;
    }
    originalAlert(msg);
};

window.currentGame = null; 
let bsGameOverModal;

document.addEventListener("DOMContentLoaded", () => {
    const goModalEl = document.getElementById('gameOverModal');
    if (goModalEl) {
        bsGameOverModal = new bootstrap.Modal(goModalEl);
        
        // 🚀 FIX: Buscar y cambiar "Volver a jugar" por "Retar" y vincular el Modal de Espera
        const elementos = goModalEl.querySelectorAll('*');
        elementos.forEach(el => {
            el.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && /Volver a [Jj]ugar/i.test(node.nodeValue)) {
                    node.nodeValue = node.nodeValue.replace(/Volver a [Jj]ugar/i, 'Retar');
                    
                    // Al hacer clic en "Retar", cerramos este modal y mostramos el de "Esperando"
                    if (node.parentElement && (node.parentElement.tagName === 'BUTTON' || node.parentElement.tagName === 'A')) {
                        node.parentElement.addEventListener('click', () => {
                            if (typeof bsGameOverModal !== 'undefined') bsGameOverModal.hide();
                            if (typeof window.mostrarEsperandoRetador === 'function') {
                                window.mostrarEsperandoRetador();
                            }
                        });
                    }
                }
            });
        });
    }

    // 🚀 FIX: Inyección de CSS para separación de 10px y reparación del desorden en móviles
    if (!document.getElementById('mobileGameOverFix')) {
        const cssFix = document.createElement('style');
        cssFix.id = 'mobileGameOverFix';
        cssFix.innerHTML = `
            /* 1. Separación estricta de 10px respecto al tablero de juego */
            #gameOverModal .modal-dialog {
                margin-top: 10px !important;
            }
            
            /* 2. Ajustes exclusivos para vista de Celulares */
            @media (max-width: 576px) {
                /* Eliminar todos los márgenes gigantes por defecto para juntar los elementos */
                #gameOverModal .mt-4, #gameOverModal .mb-4, #gameOverModal .my-4,
                #gameOverModal .mt-3, #gameOverModal .mb-3, #gameOverModal .my-3 {
                    margin-top: 0 !important;
                    margin-bottom: 0 !important;
                }

                /* Reducir el padding interno para ganar espacio */
                #gameOverModal .modal-body, #gameOverModal .modal-header {
                    padding: 0.5rem !important;
                    border-bottom: none !important;
                }

                /* Agregar la línea divisoria <hr> simulada DEBAJO del título */
                #goHeader::after, 
                #gameOverModal .modal-header::after {
                    content: "";
                    display: block;
                    width: 100%;
                    height: 1px;
                    background-color: rgba(255, 255, 255, 0.15);
                    margin-top: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                #goHeader, #gameOverModal .modal-header {
                    padding-bottom: 0 !important;
                    border-bottom: none !important;
                    flex-direction: column;
                }

                /* Forzar a que los botones se mantengan siempre en una sola línea horizontal pegados */
                #gameOverModal .modal-body > div:last-child,
                #gameOverModal .d-flex.justify-content-center,
                #pcStatsContainer {
                    flex-wrap: nowrap !important;
                    gap: 0.25rem !important;
                    justify-content: space-between !important;
                    margin-top: 0 !important; 
                    margin-bottom: 0 !important;
                }
                
                /* Reducir el padding y tamaño de fuente, y repartir el espacio equitativamente */
                #gameOverModal .btn {
                    font-size: 0.75rem !important;
                    padding: 0.4rem 0.2rem !important;
                    white-space: nowrap !important;
                    flex: 1; /* Obliga a los botones a tener el mismo tamaño */
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    margin: 0 !important;
                }
            }
        `;
        document.head.appendChild(cssFix);
    }
    
    // 🚀 VIGILANTE SILENCIOSO: Oculta la barra móvil automáticamente al jugar y LIMPIA MODALES
    const gameView = document.getElementById('game-view');
    const bottomBar = document.querySelector('.mobile-bottom-bar');
    
    if (gameView) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (gameView.style.display === 'block') {
                        if (bottomBar) bottomBar.style.display = 'none'; // Desaparece al jugar
                        
                        // 💥 DESTRUCTOR DE MODALES: Aniquila cualquier modal horrible que haya quedado abierto
                        try {
                            if (typeof Swal !== 'undefined') Swal.close();
                            if (typeof swal !== 'undefined') swal.close();
                            
                            const waitingModalEl = document.getElementById('waitingModal');
                            if (waitingModalEl) {
                                const wModal = bootstrap.Modal.getInstance(waitingModalEl);
                                if (wModal) wModal.hide();
                            }

                            // Limpiar el modal de "Esperando retador"
                            const waitingChallengerModalEl = document.getElementById('waitingChallengerModal');
                            if (waitingChallengerModalEl) {
                                const wcModal = bootstrap.Modal.getInstance(waitingChallengerModalEl);
                                if (wcModal) wcModal.hide();
                            }

                            // Limpiar modal de abandono si estuviera abierto
                            const abandonModalEl = document.getElementById('abandonModal');
                            if (abandonModalEl) {
                                const aModal = bootstrap.Modal.getInstance(abandonModalEl);
                                if (aModal) aModal.hide();
                            }
                            
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                            document.querySelectorAll('.modal-backdrop, .swal2-container').forEach(el => el.remove());
                        } catch (e) {
                            console.error("Error limpiando modales fantasmas:", e);
                        }

                    } else {
                        if (bottomBar) bottomBar.style.display = 'flex'; // Vuelve en el lobby
                    }
                }
            });
        });
        observer.observe(gameView, { attributes: true });
    }
});

function getInitialState(type) {
    if(type === 'gato') return { board: Array(9).fill(0) };
    if(type === '4linea') return { board: Array(42).fill(0) }; 
    if(type === 'gomoku') return { board: Array(225).fill(0) }; 
    if(type === 'reversi') {
        let b = Array(64).fill(0);
        b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2;
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

let pendingGameTypeForPC = null;
let pcConfigModalInst = null;
window.tempPCConfig = { diff: 'normal', starter: 1 };

function showPCConfigModal(gameType) {
    pendingGameTypeForPC = gameType;
    window.tempPCConfig = { diff: 'normal', starter: 1 }; 
    
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
                        <h6 class="text-light mb-3 border-bottom border-secondary pb-2"><i class="bi bi-cpu"></i> 1. Nivel de Inteligencia</h6>
                        <div class="d-flex justify-content-between gap-2 mb-4">
                            <button id="btnDiffFacil" class="btn flex-fill rounded-pill shadow-sm btn-outline-success" onclick="setTempDiff('facil')">Fácil</button>
                            <button id="btnDiffNormal" class="btn flex-fill rounded-pill shadow-sm btn-warning fw-bold text-dark" onclick="setTempDiff('normal')">Normal</button>
                            <button id="btnDiffDificil" class="btn flex-fill rounded-pill shadow-sm btn-outline-danger" onclick="setTempDiff('dificil')">Difícil</button>
                        </div>
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
    
    setTempDiff('normal');
    setTempStarter(1);
    pcConfigModalInst.show();
}

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
        if (finalStarter === 0) {
            finalStarter = Math.random() < 0.5 ? 1 : 2; 
        }
        window.startLocalGame(pendingGameTypeForPC, true, window.tempPCConfig.diff, finalStarter);
        pendingGameTypeForPC = null; 
    }
};

window.startLocalGame = (type, vsPC = false, difficulty = null, startingTurn = null) => {
    if (vsPC && difficulty === null) {
        if (window.currentGame && window.currentGame.vsPC && window.currentGame.difficulty) {
            difficulty = window.currentGame.difficulty;
            startingTurn = window.currentGame.originalStartingTurn === 1 ? 2 : 1; 
        } else {
            showPCConfigModal(type);
            return; 
        }
    }

    let finalDifficulty = difficulty || 'normal';
    let finalStarter = startingTurn || 1; 

    window.currentGame = { 
        mode: 'local', 
        vsPC: vsPC, 
        difficulty: finalDifficulty, 
        originalStartingTurn: finalStarter, 
        gameType: type, 
        status: 'playing', 
        currentLocalTurn: finalStarter,     
        gameState: getInitialState(type),
        confettiFired: false // Control de confeti
    };
    
    document.getElementById('lobby-view').style.display = 'none'; 
    document.getElementById('game-view').style.display = 'block';
    
    let btnStats = document.getElementById('btnPostGameStats');
    if (btnStats) btnStats.style.display = 'none';
    
    window.renderGameBoard();
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    
    if (vsPC && finalStarter === 2) {
        setTimeout(window.makePCMove, 800);
    }
};

window.renderGameBoard = () => {
    if(!window.currentGame) return;

    // 🚀 FIX: Forzar el cierre del modal de "Fin de Partida" u otros estorbos si un nuevo juego ha comenzado
    if (window.currentGame.status === 'playing') {
        if (typeof bsGameOverModal !== 'undefined' && bsGameOverModal) bsGameOverModal.hide();
        
        try {
            const waitingModalEl = document.getElementById('waitingModal');
            if (waitingModalEl) {
                const wModal = bootstrap.Modal.getInstance(waitingModalEl);
                if (wModal) wModal.hide();
            }

            const waitingChallengerModalEl = document.getElementById('waitingChallengerModal');
            if (waitingChallengerModalEl) {
                const wcModal = bootstrap.Modal.getInstance(waitingChallengerModalEl);
                if (wcModal) wcModal.hide();
            }
            
            const abandonModalEl = document.getElementById('abandonModal');
            if (abandonModalEl) {
                const aModal = bootstrap.Modal.getInstance(abandonModalEl);
                if (aModal) aModal.hide();
            }

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
    
    // Inyectar CSS de animaciones suaves dinámicamente si no existe
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
            
            /* 🔥 NUEVO: EFECTOS GLOW PARA TEXTO DE VICTORIA Y DERROTA */
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
                    // Adorno Dorado/Amarillo de Victoria
                    indicatorText = `¡Felicidades ${myName}! Has ganado la partida.`;
                    indicatorClass = "win-text-effect";
                    
                    // 🚀 DISPARAR CONFETI
                    if (!window.currentGame.confettiFired && typeof confetti === 'function') {
                        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 1060 });
                        window.currentGame.confettiFired = true;
                    }
                } else {
                    // Adorno Rojo de Derrota
                    indicatorText = `¡Has perdido la partida contra ${oppName}!`;
                    indicatorClass = "lose-text-effect";
                }
            } else if (window.currentGame.mode === 'local') {
                // En local no hay nombres de usuario reales, usamos los colores de fichas
                let colorGanador = (type === 'reversi' || type === 'gomoku') ? (wNum === 1 ? 'Negras' : 'Blancas') : (wNum === 1 ? 'Rojas' : 'Azules');
                
                if (window.currentGame.vsPC) {
                    if (wNum === 1) {
                        indicatorText = `¡Felicidades! Has ganado la partida.`;
                        indicatorClass = "win-text-effect";
                        
                        // 🚀 DISPARAR CONFETI
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
                    
                    // 🚀 DISPARAR CONFETI (Modo local 1v1 siempre explota)
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
        // Textos durante el transcurso normal del juego
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
                // El oponente está pensando, mostramos texto blanco brillante para que se lea en el fondo oscuro
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

    // Renderizado individual de casillas y fichas sin animaciones CSS
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
            let row = Math.floor(i/8); let col = i%8; let d = document.createElement('div');
            let isDark = (row+col)%2 !== 0; d.className = `cell ${isDark ? 'chk-dark' : 'chk-light'}`;
            if (isMyTurn && typeof localSelection !== 'undefined' && localSelection.validMoves.includes(i)) { d.classList.add('valid-move'); d.style.cursor = 'pointer'; }
            if(cell !== 0) {
                let piece = document.createElement('div'); piece.className = `chk-piece ${cell===1 || cell===3 ? 'chk-p1' : 'chk-p2'}`;
                if(cell>2) piece.innerText = '♚'; 
                if(isMyTurn && typeof localSelection !== 'undefined' && localSelection.selectedPiece === i) piece.style.transform = "scale(1.15)";
                if(window.currentGame.status === 'finished' && window.currentGame.winningLine && window.currentGame.winningLine.includes(i)) piece.classList.add('winning-piece');
                d.appendChild(piece);
            }
            d.onclick = () => window.attemptMove(i, myPlayerNum, isMyTurn); boardDiv.appendChild(d);
        });
    }
};

// ==========================================
// NUEVOS MODALES: ESPERA Y ABANDONO
// ==========================================
window.mostrarEsperandoRetador = () => {
    let modalEl = document.getElementById('waitingChallengerModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="waitingChallengerModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-info text-center shadow-lg" style="background: rgba(20, 20, 30, 0.95); backdrop-filter: blur(12px);">
                    <div class="modal-body py-5">
                        <div class="spinner-border text-info mb-4 shadow" style="width: 3.5rem; height: 3.5rem;" role="status"></div>
                        <h4 class="fw-bold text-white mb-3">Preparando partida...</h4>
                        <p class="text-light" style="font-size: 1.1rem;">Esperando confirmación del oponente...</p>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('waitingChallengerModal');
    }
    const inst = new bootstrap.Modal(modalEl);
    inst.show();
};

window.mostrarModalAbandono = (nombreOponente) => {
    // Ocultar la pantalla de fin de juego o de espera si estuviera abierta
    if (typeof bsGameOverModal !== 'undefined' && bsGameOverModal) bsGameOverModal.hide();
    ['waitingModal', 'waitingChallengerModal', 'pcConfigModal'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            let inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
        }
    });

    let modalEl = document.getElementById('abandonModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="abandonModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-danger text-center shadow-lg">
                    <div class="modal-body py-5">
                        <i class="bi bi-door-open-fill text-danger display-1 mb-3 d-block"></i>
                        <h4 class="fw-bold text-white mb-2">Partida Abandonada</h4>
                        <p class="text-light" id="abandonModalMessage">El oponente ha abandonado el juego.</p>
                        <button class="btn btn-outline-danger rounded-pill mt-4 px-4 shadow-sm" onclick="cerrarAbandono()">
                            Volver al Menú
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('abandonModal');
    }
    
    let targetName = nombreOponente || (window.currentGame ? window.currentGame.opponent : 'El oponente');
    document.getElementById('abandonModalMessage').innerHTML = `<strong class="text-warning">${targetName}</strong> ha abandonado la partida o rechazado el reto.`;
    
    const abandonInst = new bootstrap.Modal(modalEl);
    abandonInst.show();
};

window.cerrarAbandono = () => {
    let modalEl = document.getElementById('abandonModal');
    if (modalEl) {
        let inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
    }
    if (typeof window.closeGameOver === 'function') window.closeGameOver();
};

// 🚀 Escuchar eventos de abandono desde el servidor para disparar el modal
if (typeof socket !== 'undefined') {
    socket.on('opponent_abandoned', (data) => {
        window.mostrarModalAbandono(data ? data.username : null);
    });
    
    socket.on('player_left', (data) => {
        window.mostrarModalAbandono(data ? data.username : null);
    });
    
    socket.on('reto_rechazado', (data) => {
        // En caso de que se rechace un reto cuando venimos del modal de Fin de Juego
        if (window.currentGame && window.currentGame.status === 'finished') {
            window.mostrarModalAbandono(data ? (data.target || data.retado) : null);
        }
    });
    
    socket.on('reto_cancelado', (data) => {
        window.mostrarModalAbandono(data ? data.username : null);
    });
}