// Nombre: network.js
// Ubicación: static/js/

// ==========================================
// [MÓDULO: NETWORK] - SISTEMA DE RECONEXIÓN Y DESCONEXIÓN
// ==========================================
let disconnectModalInst = null;

/**
 * [MÓDULO: NETWORK]
 * Constructor perezoso (Lazy Load) para el modal que salta cuando el socket pierde la conexión
 * (ej: celular apagado o wifi caído).
 */
function getOrCreateDisconnectModal() {
    let modalEl = document.getElementById('disconnectModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="disconnectModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-warning text-center shadow-lg">
                    <div class="modal-body py-5" id="disconnectModalBody">
                        <i class="bi bi-wifi-off text-warning display-1 mb-3 d-block heartbeat"></i>
                        <h3 class="fw-bold text-white" id="disconnectTitle">Problema de Conexión</h3>
                        <p class="text-muted" id="disconnectMessage">Se ha perdido la conexión con el servidor.</p>
                        <div id="disconnectAction" class="mt-4"></div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml); 
        modalEl = document.getElementById('disconnectModal');
    } 
    return new bootstrap.Modal(modalEl);
}

// [MÓDULO: NETWORK] Evento del cliente Socket cuando él mismo se desconecta.
socket.on('disconnect', () => {
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        if(!disconnectModalInst) disconnectModalInst = getOrCreateDisconnectModal();
        document.getElementById('disconnectTitle').innerText = "¡Te has desconectado!";
        document.getElementById('disconnectMessage').innerText = "Tu dispositivo entró en suspensión o perdió señal. El juego está pausado.";
        document.getElementById('disconnectAction').innerHTML = `<button class="btn btn-warning rounded-pill px-4 fw-bold shadow" onclick="reconectarJuego()"><i class="bi bi-arrow-clockwise"></i> Reconectar y Reanudar</button>`;
        disconnectModalInst.show();
    }
});

/**
 * [MÓDULO: NETWORK]
 * Intenta forzar la reconexión al servidor de WebSockets.
 */
window.reconectarJuego = () => { 
    document.getElementById('disconnectAction').innerHTML = `<div class="spinner-border text-warning"></div><p class="mt-2 text-muted">Reconectando...</p>`; 
    socket.connect(); 
};

// [MÓDULO: NETWORK] El servidor nos avisa que la *otra* persona se desconectó temporalmente.
socket.on('opponent_disconnected', () => {
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        if(!disconnectModalInst) disconnectModalInst = getOrCreateDisconnectModal();
        document.getElementById('disconnectTitle').innerText = "Oponente Desconectado";
        document.getElementById('disconnectMessage').innerHTML = `<strong>${window.currentGame.opponent}</strong> tiene problemas de conexión.<br>Por favor, espera en esta pantalla a que reanude el juego...`;
        
        // 🚀 NUEVO: Agregamos el botón para salir de la partida si el jugador se cansa de esperar
        document.getElementById('disconnectAction').innerHTML = `
            <div class="spinner-grow text-warning" role="status"></div>
            <p class="mt-2 small text-muted">Esperando reconexión...</p>
            <button class="btn btn-outline-danger rounded-pill mt-4 px-4 shadow-sm" onclick="abandonarPorDesconexion()">
                <i class="bi bi-box-arrow-left"></i> Salir al Menú
            </button>
        `;
        
        disconnectModalInst.show();
    }
});

// NUEVA FUNCIÓN: Permite al usuario cerrar todo y volver al lobby
window.abandonarPorDesconexion = () => {
    if (disconnectModalInst) {
        disconnectModalInst.hide();
    }
    if (typeof window.closeGameOver === 'function') {
        window.closeGameOver();
    }
};

// [MÓDULO: NETWORK] Cuando logramos volver a engancharnos a la red tras una desconexión.
socket.on('connect', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') { 
        socket.emit('resume_game', { room: window.currentGame.roomId }); 
    }
});

// [MÓDULO: NETWORK] El servidor nos avisa que la otra persona ya volvió; le pasamos nuestro estado para sincronizarlo.
socket.on('opponent_reconnected', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    if (window.currentGame && window.currentGame.mode === 'multi') { 
        socket.emit('sync_state', { room: window.currentGame.roomId, gameState: window.currentGame.gameState, turn: window.currentGame.turn }); 
    }
});

// [MÓDULO: NETWORK] Recibimos el estado de la partida desde el otro jugador después de reconectarnos.
socket.on('receive_sync', (data) => {
    if (window.currentGame && window.currentGame.mode === 'multi') { 
        window.currentGame.gameState = data.gameState; 
        window.currentGame.turn = data.turn; 
        if(typeof window.renderGameBoard === 'function') window.renderGameBoard(); 
    }
});