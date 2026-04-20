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
// 🚀 FIX CRÍTICO DAMAS: Restaurada la variable global que maneja las selecciones y saltos múltiples en Damas
window.localSelection = { selectedPiece: null, validMoves: [], multiJumping: false };
let localSelection = window.localSelection; 
let bsGameOverModal;



// ==============================================================================
// LÓGICA CORE (Este código se quedará en game.js en el futuro)
// ==============================================================================
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

    // Limpiamos las selecciones previas de damas al iniciar un nuevo juego
    window.localSelection = { selectedPiece: null, validMoves: [], multiJumping: false };
    localSelection = window.localSelection;

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
    
    // =========================================================
    // MODIFICACIÓN CHAT: Aseguramos que el chat esté OCULTO 
    // cuando se juega contra la PC (Local).
    // =========================================================
    let chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.style.display = 'none';
    }
    
    let btnStats = document.getElementById('btnPostGameStats');
    if (btnStats) btnStats.style.display = 'none';
    
    window.renderGameBoard();
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    
    if (vsPC && finalStarter === 2) {
        setTimeout(window.makePCMove, 800);
    }
};