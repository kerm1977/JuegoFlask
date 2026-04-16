// ✂️ ========================================================= ✂️
// ✂️ ARCHIVO 2: lobby.js                                       ✂️
// ✂️ CORTA DESDE AQUÍ ABAJO                                    ✂️
// ✂️ ========================================================= ✂️

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

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('playersModal')) playersModalInst = new bootstrap.Modal(document.getElementById('playersModal'));
    if(document.getElementById('selectGameModal')) selectGameModalInst = new bootstrap.Modal(document.getElementById('selectGameModal'));
    if(document.getElementById('rechazarModal')) rechazarModalInst = new bootstrap.Modal(document.getElementById('rechazarModal'));
});

/**
 * [MÓDULO: LOBBY]
 * Muestra el modal de jugadores y envía un evento al servidor para obtener la lista
 * actualizada de usuarios conectados y desconectados.
 */
window.solicitarListaJugadores = () => {
    if(!estaAutenticado) { alert("Debes iniciar sesión para ver los jugadores."); return; }
    document.getElementById('playersListContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-info"></div></div>';
    if(playersModalInst) playersModalInst.show();
    socket.emit('solicitar_jugadores');
};

// [MÓDULO: LOBBY] Escuchar cambios de estado (conectado/desconectado) en tiempo real
socket.on('online_users_updated', () => {
    const modalEl = document.getElementById('playersModal');
    // Si el modal está abierto en pantalla, volvemos a pedir la lista automáticamente
    if (modalEl && modalEl.classList.contains('show')) {
        socket.emit('solicitar_jugadores');
    }
});

// [MÓDULO: LOBBY] Recibe la lista de jugadores y la renderiza en el modal correspondiente.
socket.on('lista_jugadores', (jugadores) => {
    const container = document.getElementById('playersListContainer');
    container.innerHTML = '';
    
    if (jugadores.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay otros jugadores registrados.</p>'; return;
    }

    jugadores.forEach(j => {
        let statusHtml = j.is_online ? '<span class="status-indicator status-online"></span> <span class="text-success small">En línea</span>' 
                                     : '<span class="status-indicator status-offline"></span> <span class="text-muted small">Desconectado</span>';
        
        let btnRetarHtml = j.is_online ? `<button class="btn btn-sm btn-outline-warning rounded-pill" onclick="prepararReto('${j.username}')"><i class="bi bi-lightning-charge-fill"></i> Retar</button>` 
                                  : `<button class="btn btn-sm btn-outline-secondary rounded-pill" disabled>Ausente</button>`;

        let btnStatsHtml = `<button class="btn btn-sm btn-outline-info rounded-pill ms-2" onclick="verEstadisticas('${j.username}')"><i class="bi bi-bar-chart-line-fill"></i> Stats</button>`;

        container.innerHTML += `
            <div class="player-list-item d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
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
    });
});

/**
 * [MÓDULO: LOBBY]
 * Almacena el nombre del usuario a retar, oculta el modal de jugadores
 * y abre el modal de selección de juego.
 * @param {string} username - Nombre del jugador al que se desea retar.
 */
window.prepararReto = (username) => {
    targetUserToChallenge = username;
    if(playersModalInst) playersModalInst.hide();
    if(selectGameModalInst) selectGameModalInst.show();
};

/**
 * [MÓDULO: LOBBY]
 * Envía el reto de juego al jugador seleccionado anteriormente a través del socket.
 * @param {string} gameType - El identificador del juego (gato, 4linea, damas, etc).
 */
window.enviarReto = (gameType) => {
    if(selectGameModalInst) selectGameModalInst.hide();
    socket.emit('enviar_reto', { target: targetUserToChallenge, game_type: gameType });
    alert(`Reto enviado a ${targetUserToChallenge}. Esperando respuesta...`);
};

// ==========================================
// [MÓDULO: STATS] - SISTEMA DE ESTADÍSTICAS, PAGINACIÓN Y PERFIL
// ==========================================
window.currentStatsData = [];
window.currentStatsPage = 1;

/**
 * [MÓDULO: STATS]
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
 * [MÓDULO: STATS]
 * Construye dinámicamente el modal de estadísticas en el DOM si no existe,
 * y devuelve la instancia de Bootstrap del modal.
 * @returns {bootstrap.Modal} Instancia del modal de estadísticas.
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
            // Si el título no incluye "Mi Perfil", significa que estábamos viendo a otro jugador, podemos reabrir la lista
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
 * [MÓDULO: STATS]
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

// [MÓDULO: STATS] Recibe el historial de la BD, lo agrupa por oponente/juego y llama al renderizado paginado.
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
                <div class="display-6 text-success fw-bold">${data.victorias}</div>
                <div class="small text-light text-uppercase fw-bold letter-spacing">Victorias</div>
            </div>
            <div class="col-4 border-end border-secondary">
                <div class="display-6 text-danger fw-bold">${data.derrotas}</div>
                <div class="small text-light text-uppercase fw-bold letter-spacing">Derrotas</div>
            </div>
            <div class="col-4">
                <div class="display-6 text-warning fw-bold">${data.empates}</div>
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
 * [MÓDULO: STATS]
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

// ==========================================
// [MÓDULO: LOBBY] - GESTIÓN DE RETOS ENTRANTES Y OVERLAY
// ==========================================

// [MÓDULO: LOBBY] Evento socket: muestra la pantalla gigante cuando recibimos un reto de alguien.
socket.on('recibir_reto', (data) => {
    currentChallenger = data.retador;
    currentGameToPlay = data.game_type;
    
    let gameName = data.game_type === 'gato' ? 'Gato' : (data.game_type === '4linea' ? '4 en Línea' : (data.game_type === 'damas' ? 'Damas' : (data.game_type === 'reversi' ? 'Reversi' : 'Gomoku')));

    document.getElementById('retadorNombre').innerHTML = `<strong>${currentChallenger}</strong> te ha retado a una partida de <strong>${gameName}</strong>.`;
    
    document.getElementById('retoOverlay').style.display = 'flex';
});

/**
 * [MÓDULO: LOBBY]
 * Envía nuestra respuesta final al servidor (Aceptar o Rechazar el reto).
 * @param {boolean} aceptado - true si el usuario aceptó jugar, false en caso contrario.
 */
window.responderReto = (aceptado) => {
    if(rechazarModalInst) rechazarModalInst.hide();
    document.getElementById('retoOverlay').style.display = 'none';
    
    socket.emit('respuesta_reto', {
        retador: currentChallenger,
        aceptado: aceptado,
        game_type: currentGameToPlay
    });
    
    if(!aceptado) {
        currentChallenger = null; currentGameToPlay = null;
    }
};

/**
 * [MÓDULO: LOBBY]
 * Muestra el modal secundario para confirmar si realmente queremos rechazar.
 */
window.confirmarRechazo = () => {
    document.getElementById('retoOverlay').style.display = 'none';
    if(rechazarModalInst) rechazarModalInst.show();
};

/**
 * [MÓDULO: LOBBY]
 * Oculta el modal de rechazo y vuelve a mostrar el Overlay de reto principal.
 */
window.cancelarRechazo = () => {
    if(rechazarModalInst) rechazarModalInst.hide();
    document.getElementById('retoOverlay').style.display = 'flex';
};

// [MÓDULO: LOBBY] Evento socket: nos notifica si la otra persona no quiso jugar.
socket.on('reto_rechazado', (data) => {
    alert(`El jugador ${data.retado} ha rechazado tu reto. ¡Qué gallina! 🐔`);
});

// ✂️ ========================================================= ✂️
// ✂️ FIN DEL ARCHIVO 2: lobby.js                               ✂️
// ✂️ ========================================================= ✂️

