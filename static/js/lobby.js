// Nombre: lobby.js
// Ubicación: static/js/

// ==========================================
// [MÓDULO: LOBBY] - CONEXIÓN SOCKET.IO Y SISTEMA DE RETOS
// ==========================================

// Solución: Pasar el origen de la URL explícitamente para que autoConnect: false funcione al 100%
const socket = io(window.location.origin, {
    autoConnect: false,             // <-- Evita el bloqueo del servidor en el Login
    reconnection: true,             
    reconnectionAttempts: Infinity, 
    reconnectionDelay: 1000         
});

// Validación súper estricta para conectar el Socket SOLO si el usuario inició sesión
const nombreUsuario = window.CURRENT_USERNAME ? String(window.CURRENT_USERNAME).trim() : "";
const estaAutenticado = nombreUsuario !== "" && nombreUsuario !== "None" && nombreUsuario !== "False";

if (estaAutenticado) {
    socket.connect();
}

let currentChallenger = null;
let currentGameToPlay = null;
let targetUserToChallenge = null;
let playersModalInst = null;
let selectGameModalInst = null;
let rechazarModalInst = null;
let statsModalInst = null;
let waitingModalInst = null; // Instancia del Modal de Espera (Glassmorphism)

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('playersModal')) playersModalInst = new bootstrap.Modal(document.getElementById('playersModal'));
    if(document.getElementById('selectGameModal')) selectGameModalInst = new bootstrap.Modal(document.getElementById('selectGameModal'));
    if(document.getElementById('rechazarModal')) rechazarModalInst = new bootstrap.Modal(document.getElementById('rechazarModal'));
});

// ==========================================
// [MÓDULO: LOBBY] - LISTA DE JUGADORES
// ==========================================

/**
 * Muestra el modal de jugadores y envía un evento al servidor para obtener la lista
 * actualizada de usuarios conectados y desconectados.
 */
window.solicitarListaJugadores = () => {
    if(!estaAutenticado) { alert("Debes iniciar sesión para ver los jugadores."); return; }
    document.getElementById('playersListContainer').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-info"></div></div>';
    if(playersModalInst) playersModalInst.show();
    socket.emit('solicitar_jugadores');
};

// Escuchar cambios de estado (conectado/desconectado) en tiempo real
socket.on('online_users_updated', () => {
    const modalEl = document.getElementById('playersModal');
    // Si el modal está abierto en pantalla, volvemos a pedir la lista automáticamente
    if (modalEl && modalEl.classList.contains('show')) {
        socket.emit('solicitar_jugadores');
    }
});

// Recibe la lista detallada de jugadores y la renderiza en el modal correspondiente.
socket.on('lista_jugadores', (jugadores) => {
    const container = document.getElementById('playersListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (jugadores.length === 0 || (jugadores.length === 1 && jugadores[0].username === nombreUsuario)) {
        container.innerHTML = '<p class="text-center text-muted p-4">No hay otros jugadores registrados.</p>'; return;
    }

    let listHtml = '<div class="list-group list-group-flush">';
    jugadores.forEach(j => {
        if (j.username !== nombreUsuario) { // Evitamos mostrarnos a nosotros mismos
            let statusHtml = j.is_online ? '<span class="status-indicator status-online"></span> <span class="text-success small">En línea</span>' 
                                         : '<span class="status-indicator status-offline"></span> <span class="text-muted small">Desconectado</span>';
            
            let btnRetarHtml = j.is_online ? `<button class="btn btn-sm btn-outline-warning rounded-pill" onclick="prepararReto('${j.username}')"><i class="bi bi-lightning-charge-fill"></i> Retar</button>` 
                                           : `<button class="btn btn-sm btn-outline-secondary rounded-pill" disabled>Ausente</button>`;

            let btnStatsHtml = `<button class="btn btn-sm btn-outline-info rounded-pill ms-2" onclick="verEstadisticas('${j.username}')"><i class="bi bi-bar-chart-line-fill"></i> Stats</button>`;

            listHtml += `
                <div class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center p-3">
                    <div>
                        <strong><i class="bi bi-person-fill text-info"></i> ${j.username}</strong><br>
                        ${statusHtml}
                    </div>
                    <div class="d-flex align-items-center">
                        ${btnRetarHtml}
                        ${btnStatsHtml}
                    </div>
                </div>
            `;
        }
    });
    listHtml += '</div>';
    container.innerHTML = listHtml;
});

// ==========================================
// [MÓDULO: LOBBY] - SISTEMA DE RETOS INTERACTIVOS
// ==========================================

window.prepararReto = (username) => {
    targetUserToChallenge = username;
    if(playersModalInst) playersModalInst.hide();
    if(selectGameModalInst) selectGameModalInst.show();
};

function getOrCreateWaitingModal() {
    let modalEl = document.getElementById('waitingModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="waitingModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-info text-center shadow-lg" style="background: rgba(20, 20, 30, 0.95); backdrop-filter: blur(12px);">
                    <div class="modal-body py-5">
                        <div class="spinner-grow text-info mb-4" style="width: 3rem; height: 3rem;" role="status"></div>
                        <h4 class="fw-bold text-white mb-3" id="waitingModalTitle">Enviando Reto...</h4>
                        <p class="text-muted" id="waitingModalMessage">Esperando respuesta del oponente...</p>
                        <button class="btn btn-outline-danger rounded-pill mt-4 px-4 shadow-sm" onclick="cancelarRetoEnviado()">
                            <i class="bi bi-x-circle"></i> Cancelar Reto
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('waitingModal');
    }
    return new bootstrap.Modal(modalEl);
}

window.enviarReto = (gameType) => {
    if (selectGameModalInst) selectGameModalInst.hide();
    
    socket.emit('enviar_reto', {
        target: targetUserToChallenge,
        game_type: gameType
    });

    // Desplegamos el Modal Glassmorphism de espera
    if (!waitingModalInst) waitingModalInst = getOrCreateWaitingModal();
    document.getElementById('waitingModalTitle').innerHTML = `Reto de ${gameType.toUpperCase()}`;
    document.getElementById('waitingModalMessage').innerHTML = `Esperando a que <strong>${targetUserToChallenge}</strong> acepte tu desafío...`;
    waitingModalInst.show();
};

window.cancelarRetoEnviado = () => {
    if (waitingModalInst) waitingModalInst.hide();
    targetUserToChallenge = null;
};

// Muestra la pantalla gigante cuando recibimos un reto
socket.on('recibir_reto', (data) => {
    currentChallenger = data.retador;
    currentGameToPlay = data.game_type;
    
    let gameName = data.game_type === 'gato' ? 'Gato' : (data.game_type === '4linea' ? '4 en Línea' : (data.game_type === 'damas' ? 'Damas' : (data.game_type === 'reversi' ? 'Reversi' : 'Gomoku')));

    const overlay = document.getElementById('retoOverlay');
    const retadorText = document.getElementById('retadorNombre');
    
    if (overlay && retadorText) {
        retadorText.innerHTML = `¡<strong>${data.retador}</strong> te ha desafiado a una partida de <strong>${gameName}</strong>!`;
        overlay.style.display = 'flex';
    }
});

window.responderReto = (aceptado) => {
    if(rechazarModalInst) rechazarModalInst.hide();
    const overlay = document.getElementById('retoOverlay');
    if (overlay) overlay.style.display = 'none';
    
    socket.emit('respuesta_reto', {
        retador: currentChallenger,
        aceptado: aceptado,
        game_type: currentGameToPlay
    });
    
    if(!aceptado) {
        currentChallenger = null; currentGameToPlay = null;
    }
};

window.confirmarRechazo = () => {
    const overlay = document.getElementById('retoOverlay');
    if (overlay) overlay.style.display = 'none';
    if(rechazarModalInst) rechazarModalInst.show();
};

window.cancelarRechazo = () => {
    if(rechazarModalInst) rechazarModalInst.hide();
    const overlay = document.getElementById('retoOverlay');
    if (overlay) overlay.style.display = 'flex';
};

// Modal de Rechazo (Glassmorphism)
socket.on('reto_rechazado', (data) => {
    if (waitingModalInst) waitingModalInst.hide();
    
    let rejectedModalEl = document.getElementById('rejectedModal');
    if (!rejectedModalEl) {
        const modalHtml = `
        <div class="modal fade" id="rejectedModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal border-danger text-center shadow-lg">
                    <div class="modal-body py-5">
                        <i class="bi bi-emoji-frown text-danger display-1 mb-3 d-block"></i>
                        <h4 class="fw-bold text-white mb-2">Reto Rechazado</h4>
                        <p class="text-muted" id="rejectedModalMessage">El oponente no puede jugar ahora.</p>
                        <button class="btn btn-outline-light rounded-pill mt-4 px-4 shadow-sm" data-bs-dismiss="modal">
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        rejectedModalEl = document.getElementById('rejectedModal');
    }
    
    // Aquí soportamos si el servidor envía 'target' o 'retado'
    let usernameRechazador = data.target || data.retado || "El jugador";
    document.getElementById('rejectedModalMessage').innerHTML = `<strong>${usernameRechazador}</strong> ha rechazado tu desafío.`;
    const rejectedModalInst = new bootstrap.Modal(rejectedModalEl);
    rejectedModalInst.show();
    
    targetUserToChallenge = null;
});

// Cerramos nuestra propia ventana de espera de forma limpia cuando el juego inicia
socket.on('game_started', () => {
    if (waitingModalInst) {
        waitingModalInst.hide();
    }
});

// ==========================================
// [MÓDULO: STATS] - SISTEMA DE ESTADÍSTICAS, PAGINACIÓN Y PERFIL
// ==========================================
window.currentStatsData = [];
window.currentStatsPage = 1;

/**
 * Muestra el perfil del usuario actual (el que tiene la sesión iniciada)
 * reutilizando el modal de estadísticas.
 */
window.verMiPerfil = () => {
    if (!estaAutenticado) {
        alert("Debes iniciar sesión para ver tu perfil.");
        return;
    }
    // Ocultamos otros modales si estuvieran abiertos
    if(playersModalInst) playersModalInst.hide();
    const statsModal = getOrCreateStatsModal();
    
    // Cambiamos el título para que diga "Mi Perfil"
    document.getElementById('statsModalTitle').innerHTML = `<i class="bi bi-person-badge"></i> Mi Perfil (${window.CURRENT_USERNAME})`;
    document.getElementById('statsModalBody').innerHTML = '<div class="text-center my-4"><div class="spinner-border text-info"></div><p class="mt-2 text-muted">Cargando tus datos...</p></div>';
    statsModal.show();
    
    // Solicitamos las estadísticas para nosotros mismos
    socket.emit('solicitar_estadisticas', { username: window.CURRENT_USERNAME });
};

/**
 * Construye dinámicamente el modal de estadísticas en el DOM si no existe,
 * y devuelve la instancia de Bootstrap del modal.
 */
function getOrCreateStatsModal() {
    let modalEl = document.getElementById('statsModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="statsModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content glass-modal border-info">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-info" id="statsModalTitle"><i class="bi bi-bar-chart-fill"></i> Estadísticas</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="statsModalBody">
                        <div class="text-center"><div class="spinner-border text-info"></div> Cargando...</div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('statsModal');
        
        // Manejar el cierre del modal para regresar al modal de jugadores SI este no era el perfil
        modalEl.addEventListener('hidden.bs.modal', function () {
            let titleText = document.getElementById('statsModalTitle').innerText;
            if (playersModalInst && !titleText.includes("Mi Perfil")) {
                playersModalInst.show();
            }
        });
    }
    if(!statsModalInst) statsModalInst = new bootstrap.Modal(modalEl);
    return statsModalInst;
}

/**
 * Muestra el modal de estadísticas y emite un evento para pedir los datos al servidor.
 * @param {string} username - El usuario del cual queremos ver el historial.
 */
window.verEstadisticas = (username) => {
    if(playersModalInst) playersModalInst.hide();
    const statsModal = getOrCreateStatsModal();
    document.getElementById('statsModalTitle').innerHTML = `<i class="bi bi-person-circle"></i> Stats de ${username}`;
    document.getElementById('statsModalBody').innerHTML = '<div class="text-center my-4"><div class="spinner-border text-info"></div><p class="mt-2 text-muted">Buscando el historial...</p></div>';
    statsModal.show();
    socket.emit('solicitar_estadisticas', { username: username });
};

// Recibe el historial de la BD, lo agrupa por oponente/juego y llama al renderizado paginado.
socket.on('recibir_estadisticas', (data) => {
    const body = document.getElementById('statsModalBody');
    if(!body) return;
    
    const grouped = {};
    if(data.historial && data.historial.length > 0) {
        data.historial.forEach(h => {
            const key = `${h.oponente}-${h.juego}`;
            if (!grouped[key]) {
                grouped[key] = { oponente: h.oponente, juego: h.juego, V: 0, E: 0, D: 0 };
            }
            if (h.resultado === 'Victoria') grouped[key].V++;
            else if (h.resultado === 'Derrota') grouped[key].D++;
            else if (h.resultado === 'Empate') grouped[key].E++;
        });
    }
    
    window.currentStatsData = Object.values(grouped);
    window.currentStatsPage = 1;

    let headerHtml = `
        <div class="row text-center mb-4 glass-panel p-3 mx-1">
            <div class="col-4 border-end border-secondary">
                <div class="display-6 text-success fw-bold">${data.victorias || 0}</div>
                <div class="small text-light text-uppercase fw-bold letter-spacing">Victorias</div>
            </div>
            <div class="col-4 border-end border-secondary">
                <div class="display-6 text-danger fw-bold">${data.derrotas || 0}</div>
                <div class="small text-light text-uppercase fw-bold letter-spacing">Derrotas</div>
            </div>
            <div class="col-4">
                <div class="display-6 text-warning fw-bold">${data.empates || 0}</div>
                <div class="small text-light text-uppercase fw-bold letter-spacing">Empates</div>
            </div>
        </div>
        <h6 class="text-info border-bottom border-secondary pb-2 mb-3 fw-bold"><i class="bi bi-clock-history"></i> Historial de Partidas</h6>
        <div id="statsListContainer"></div>
        <div id="statsPagination" class="d-flex justify-content-between align-items-center mt-3 px-2"></div>
    `;
    
    body.innerHTML = headerHtml;
    renderStatsPage(1);
});

/**
 * Función de paginación que renderiza una página específica del historial (10 ítems por página).
 * @param {number} page - El número de página a renderizar.
 */
window.renderStatsPage = (page) => {
    window.currentStatsPage = page;
    const container = document.getElementById('statsListContainer');
    const pagination = document.getElementById('statsPagination');
    if(!container || !pagination) return;

    if (window.currentStatsData.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3"><i class="bi bi-inbox fs-1 d-block mb-2"></i> No hay partidas registradas aún.</div>';
        pagination.innerHTML = '';
        return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(window.currentStatsData.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const slice = window.currentStatsData.slice(startIndex, startIndex + itemsPerPage);

    let listHtml = '<ul class="list-group list-group-flush glass-panel p-2">';
    slice.forEach(item => {
        listHtml += `
            <li class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center">
                <span>
                    <i class="bi bi-person-fill text-muted"></i> <strong>${item.oponente}</strong> 
                    <small class="text-info">(${item.juego})</small>
                </span>
                <span>
                    <span class="badge bg-success rounded-pill shadow-sm" style="width: 45px;">${item.V}-V</span>
                    <span class="badge bg-warning text-dark rounded-pill shadow-sm" style="width: 45px;">${item.E}-E</span>
                    <span class="badge bg-danger rounded-pill shadow-sm" style="width: 45px;">${item.D}-D</span>
                </span>
            </li>
        `;
    });
    listHtml += '</ul>';
    container.innerHTML = listHtml;

    let pagHtml = '';
    if (totalPages > 1) {
        if (page > 1) {
            pagHtml += `<button class="btn btn-sm btn-outline-info rounded-pill" onclick="renderStatsPage(${page - 1})"><i class="bi bi-chevron-left"></i> Anterior</button>`;
        } else {
            pagHtml += `<div style="width: 85px;"></div>`; 
        }
        
        pagHtml += `<span class="text-muted small">Página ${page} de ${totalPages}</span>`;

        if (page < totalPages) {
            pagHtml += `<button class="btn btn-sm btn-outline-info rounded-pill" onclick="renderStatsPage(${page + 1})">Siguiente <i class="bi bi-chevron-right"></i></button>`;
        } else {
            pagHtml += `<div style="width: 85px;"></div>`; 
        }
    }
    pagination.innerHTML = pagHtml;
};