// Nombre: main.js
// Ubicación: static/js/

// ==========================================
// [MÓDULO: AUTH] - AUTENTICACIÓN Y LLAVES JSON
// ==========================================

/**
 * [MÓDULO: AUTH]
 * Alterna la visibilidad del campo de contraseña entre texto oculto y texto visible.
 * Cambia el ícono del botón asociado.
 * @param {string} inputId - ID del input de la contraseña.
 * @param {string} iconId - ID del ícono de Bootstrap (el ojo).
 */
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("bi-eye");
        icon.classList.add("bi-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("bi-eye-slash");
        icon.classList.add("bi-eye");
    }
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    /**
     * [MÓDULO: AUTH]
     * Escucha el evento 'submit' del formulario de registro.
     * Valida las contraseñas, envía la petición al backend y, si es exitoso,
     * detona la descarga de la llave JSON y muestra el modal de confirmación.
     */
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const pin = document.getElementById('regPin').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;
        const errorDiv = document.getElementById('registerError');

        if (password !== confirm) {
            errorDiv.innerText = "Las contraseñas no coinciden.";
            errorDiv.style.display = "block";
            return;
        }

        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, pin, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                descargarLlave(data.key_data);
                const modal = new bootstrap.Modal(document.getElementById('keyDownloadedModal'));
                modal.show();
            } else {
                errorDiv.innerText = data.message;
                errorDiv.style.display = "block";
            }
        });
    });
}

/**
 * [MÓDULO: AUTH]
 * Genera un archivo .json dinámicamente en el navegador con la llave de acceso
 * y fuerza su descarga automática al dispositivo del usuario.
 * @param {Object} keyData - Objeto JSON con el correo, PIN y el hash de la contraseña.
 */
function descargarLlave(keyData) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keyData, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "llave_acceso_latribu.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

/**
 * [MÓDULO: AUTH]
 * Lee el archivo JSON subido por el usuario en la pantalla de Login,
 * lo envía al backend mediante FormData para validar la sesión y, si es correcto,
 * redirige al dashboard.
 */
function processRecoverKey() {
    const fileInput = document.getElementById('keyFileInput');
    const errorDiv = document.getElementById('recoverError');
    
    if (!fileInput.files.length) {
        errorDiv.innerText = "Por favor, selecciona el archivo de tu llave.";
        errorDiv.style.display = "block";
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("key_file", file);

    fetch('/recover', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            errorDiv.innerText = data.message;
            errorDiv.style.display = "block";
        }
    })
    .catch(err => {
        errorDiv.innerText = "Error leyendo el archivo JSON.";
        errorDiv.style.display = "block";
    });
}

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

/**
 * [MÓDULO: GAME_CORE]
 * Inicializa y configura la variable global currentGame para una partida local (Humano o vs PC).
 * Transiciona la vista del lobby al tablero.
 * @param {string} type - Tipo de juego.
 * @param {boolean} vsPC - Indica si la partida será contra la Inteligencia Artificial.
 */
window.startLocalGame = (type, vsPC = false) => {
    window.currentGame = { 
        mode: 'local', 
        vsPC: vsPC, 
        gameType: type, 
        status: 'playing', 
        currentLocalTurn: 1, 
        gameState: getInitialState(type) 
    };
    document.getElementById('lobby-view').style.display = 'none'; 
    document.getElementById('game-view').style.display = 'block';
    renderGameBoard();
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
    
    // Nombres bonitos
    let gameName = type === 'gato' ? 'Gato' : (type === '4linea' ? '4 en Línea' : (type === 'damas' ? 'Damas' : (type === 'reversi' ? 'Reversi' : 'Gomoku')));
    if(window.currentGame.mode === 'local' && window.currentGame.vsPC) gameName += " vs PC";
    document.getElementById('gameTitle').innerText = gameName;
    
    let isMyTurn, myPlayerNum, indicatorText, indicatorClass;

    // Configuración de indicadores de turno (Local vs Multi)
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
            indicatorText = type==='reversi'||type==='gomoku' ? `Turno: ${j===1?'Jugador 1 (Negro)':'Jugador 2 (Blanco)'}` : `Turno: ${j===1?'Jugador 1 (Rojo)':'Jugador 2 (Azul)'}`;
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
// [MÓDULO: GAME_LOGIC] - REVISIÓN DE VICTORIAS, IA Y LÓGICA DE JUEGOS
// ==========================================

/**
 * [MÓDULO: GAME_LOGIC]
 * Función auxiliar para el algoritmo de IA (Gato).
 * Devuelve el índice vacío que permite ganar en este turno al jugador evaluado.
 * @param {Array} board - Estado del tablero de Gato.
 * @param {number} player - Número de jugador a evaluar (1 o 2).
 * @returns {number} Índice de la casilla ganadora o -1.
 */
function findWinningMoveGato(board, player) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let l of lines) {
        let [a,b,c] = l;
        if (board[a]===player && board[b]===player && board[c]===0) return c;
        if (board[a]===player && board[c]===player && board[b]===0) return b;
        if (board[b]===player && board[c]===player && board[a]===0) return a;
    }
    return -1;
}

/**
 * [MÓDULO: GAME_LOGIC]
 * Función auxiliar para el algoritmo de IA (4 en Línea).
 * Calcula en qué fila caería una ficha si se suelta en una columna específica.
 * @param {Array} board - Estado del tablero 4 en Línea.
 * @param {number} col - Índice de la columna (0 a 6).
 * @returns {number} Fila donde caerá la ficha o -1 si la columna está llena.
 */
function getC4DropRow(board, col) {
    for(let r=5; r>=0; r--) {
        if(board[r*7+col] === 0) return r;
    }
    return -1;
}

/**
 * [MÓDULO: GAME_LOGIC]
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

/**
 * [MÓDULO: GAME_LOGIC]
 * Evalúa las reglas de Reversi/Othello. Calcula qué fichas enemigas serían
 * volteadas si el jugador coloca su ficha en un índice determinado.
 * @param {Array} board - Estado del tablero de Reversi.
 * @param {number} idx - Índice donde se quiere colocar la ficha.
 * @param {number} pNum - Número del jugador actual.
 * @returns {Array} Un array con los índices de todas las fichas que serían volteadas.
 */
function getReversiFlips(board, idx, pNum) {
    if (board[idx] !== 0) return [];
    let flips = []; let opp = pNum === 1 ? 2 : 1;
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    let r = Math.floor(idx/8), c = idx%8;
    for(let [dr, dc] of dirs) {
        let path = []; let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === opp) { path.push(nr*8+nc); nr += dr; nc += dc; }
        if(nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr*8+nc] === pNum && path.length > 0) flips.push(...path);
    }
    return flips;
}

/**
 * [MÓDULO: GAME_LOGIC] / [MÓDULO: AI]
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

    if (type === 'gato') {
        let win = findWinningMoveGato(state.board, 2);
        let block = findWinningMoveGato(state.board, 1);
        
        if (win !== -1) chosenIndex = win;
        else if (block !== -1) chosenIndex = block;
        else if (state.board[4] === 0) chosenIndex = 4; // Tomar el centro es la mejor estrategia
        else {
            let empty = [];
            state.board.forEach((c, i) => { if(c === 0) empty.push(i); });
            if(empty.length > 0) chosenIndex = empty[Math.floor(Math.random() * empty.length)];
        }
    } 
    else if (type === '4linea') {
        let bestCol = -1;
        
        // 1. ¿Puede la PC ganar en el siguiente turno?
        for(let c=0; c<7; c++) {
            let r = getC4DropRow(state.board, c);
            if(r !== -1) {
                let tempBoard = [...state.board]; tempBoard[r*7+c] = 2;
                let res = checkC4Win(tempBoard);
                if(res && res.p === 2) { bestCol = c; break; }
            }
        }
        
        // 2. ¿Necesita bloquear al jugador?
        if(bestCol === -1) {
            for(let c=0; c<7; c++) {
                let r = getC4DropRow(state.board, c);
                if(r !== -1) {
                    let tempBoard = [...state.board]; tempBoard[r*7+c] = 1;
                    let res = checkC4Win(tempBoard);
                    if(res && res.p === 1) { bestCol = c; break; }
                }
            }
        }
        
        if(bestCol !== -1) {
            chosenIndex = bestCol; // El índice horizontal servirá
        } else {
            let validCols = [];
            for(let c=0; c<7; c++) { if(state.board[c] === 0) validCols.push(c); }
            if(validCols.length > 0) chosenIndex = validCols[Math.floor(Math.random() * validCols.length)];
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
            // IA Básica para Reversi: Priorizar las 4 esquinas si están disponibles
            const corners = [0, 7, 56, 63];
            let cornerFound = validMoves.find(m => corners.includes(m));
            if(cornerFound !== undefined) {
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
                let move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
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

/**
 * [MÓDULO: GAME_LOGIC]
 * Reglas de movimiento válidas para las Damas. Calcula los saltos, movimientos simples,
 * comportamiento de las piezas normales (solo adelante) y Reyes (ambas direcciones).
 * @param {Array} board - Estado del tablero 8x8.
 * @param {number} startIdx - Índice origen de la ficha.
 * @param {number} pNum - Número del jugador actual.
 * @param {boolean} onlyJumps - Si es true, solo devuelve array con los índices de salto/captura.
 * @returns {Array} Casillas válidas a las que se puede mover.
 */
function getValidCheckersMoves(board, startIdx, pNum, onlyJumps) {
    let moves = []; let r = Math.floor(startIdx/8), c = startIdx%8;
    let isKing = board[startIdx] > 2; let dirs = [];
    if (pNum === 1 || isKing) dirs.push([-1, -1], [-1, 1]); 
    if (pNum === 2 || isKing) dirs.push([1, -1], [1, 1]);   
    for (let [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            let ni = nr * 8 + nc;
            if (!onlyJumps && board[ni] === 0) moves.push(ni); 
            else if (board[ni] !== 0 && board[ni] !== pNum && board[ni] !== pNum + 2) {
                let nnr = r + dr * 2, nnc = c + dc * 2;
                if (nnr >= 0 && nnr < 8 && nnc >= 0 && nnc < 8 && board[nnr * 8 + nnc] === 0) moves.push(nnr * 8 + nnc); 
            }
        }
    } return moves;
}

/**
 * [MÓDULO: GAME_LOGIC]
 * Evalúa el tablero de 4 en Línea verificando horizontal, vertical y diagonalmente
 * para buscar 4 casillas iguales.
 * @param {Array} b - Array del tablero (42 casillas).
 * @returns {Object|null} Retorna {p: Jugador, line: [casillas]} o null.
 */
function checkC4Win(b) {
    for(let r=0; r<6; r++) {
        for(let c=0; c<7; c++) {
            let p = b[r*7+c]; if(p === 0) continue;
            if(c<=3 && p===b[r*7+c+1] && p===b[r*7+c+2] && p===b[r*7+c+3]) return {p: p, line: [r*7+c, r*7+c+1, r*7+c+2, r*7+c+3]};
            if(r<=2 && p===b[(r+1)*7+c] && p===b[(r+2)*7+c] && p===b[(r+3)*7+c]) return {p: p, line: [r*7+c, (r+1)*7+c, (r+2)*7+c, (r+3)*7+c]};
            if(r<=2 && c<=3 && p===b[(r+1)*7+c+1] && p===b[(r+2)*7+c+2] && p===b[(r+3)*7+c+3]) return {p: p, line: [r*7+c, (r+1)*7+c+1, (r+2)*7+c+2, (r+3)*7+c+3]};
            if(r<=2 && c>=3 && p===b[(r+1)*7+c-1] && p===b[(r+2)*7+c-2] && p===b[(r+3)*7+c-3]) return {p: p, line: [r*7+c, (r+1)*7+c-1, (r+2)*7+c-2, (r+3)*7+c-3]};
        }
    } return b.includes(0) ? null : {p: -1, line: []};
}

/**
 * [MÓDULO: GAME_LOGIC]
 * Verifica si hay victoria en el clásico juego de Gato (3x3).
 * @param {Array} b - Tablero de 9 posiciones.
 * @returns {Object|null}
 */
function checkTicTacToeWin(b) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let l of lines) { 
        if(b[l[0]] !== 0 && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return {p: b[l[0]], line: l};
    }
    return b.includes(0) ? null : {p: -1, line: []};
}

/**
 * [MÓDULO: GAME_CORE]
 * Corazón del juego. Se ejecuta cada vez que un jugador (o la PC) hace clic
 * en el tablero. Ejecuta la lógica del juego actual, cambia los turnos y avisa
 * por WebSockets (si es online) o llama al bot (si es vs PC).
 * @param {number} index - Índice de la casilla pulsada.
 * @param {number} myPlayerNum - Número del jugador ejecutando el clic.
 * @param {boolean} isMyTurn - Permite o rechaza la acción según de quién es el turno.
 */
function attemptMove(index, myPlayerNum, isMyTurn) {
    // BLOQUEO DE UI: Si no es el turno, o si estamos jugando vs PC y es el turno de la máquina (2)
    if(!isMyTurn || window.currentGame.status !== 'playing' || (window.currentGame.mode === 'local' && window.currentGame.vsPC && window.currentGame.currentLocalTurn === 2 && myPlayerNum === 1)) {
        return; 
    }
    
    let state = JSON.parse(JSON.stringify(window.currentGame.gameState)); 
    let type = window.currentGame.gameType; let validMove = false; let endTurn = true; 

    if(type === 'gato') {
        if(state.board[index] === 0) { state.board[index] = myPlayerNum; validMove = true; }
    } else if (type === '4linea') {
        for(let r=5; r>=0; r--) { let i = r*7 + index; if(state.board[i] === 0) { state.board[i] = myPlayerNum; validMove = true; break; } }
    } else if (type === 'gomoku') {
        if(state.board[index] === 0) { state.board[index] = myPlayerNum; validMove = true; }
    } else if (type === 'reversi') {
        let flips = getReversiFlips(state.board, index, myPlayerNum);
        if (flips.length > 0) {
            state.board[index] = myPlayerNum; flips.forEach(i => state.board[i] = myPlayerNum); validMove = true;
        }
    } else if (type === 'damas') {
        if (!localSelection.multiJumping && (state.board[index] === myPlayerNum || state.board[index] === myPlayerNum + 2)) {
            localSelection.selectedPiece = index; localSelection.validMoves = getValidCheckersMoves(state.board, index, myPlayerNum, false);
            renderGameBoard(); return; 
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
                let furtherJumps = getValidCheckersMoves(state.board, index, myPlayerNum, true);
                if (furtherJumps.length > 0) { localSelection.selectedPiece = index; localSelection.validMoves = furtherJumps; localSelection.multiJumping = true; endTurn = false; validMove = true; } else { resetSelection(); validMove = true; }
            } else { resetSelection(); validMove = true; }
        }
    }

    // Procesamiento posterior del movimiento si fue válido
    if(validMove) {
        let winnerNum = 0;
        let winningLine = [];

        if(type === 'gato') {
            let res = checkTicTacToeWin(state.board);
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === '4linea') { 
            let res = checkC4Win(state.board);
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === 'gomoku') { 
            let res = checkGomokuWin(state.board);
            if(res) { winnerNum = res.p; winningLine = res.line; }
        } else if (type === 'reversi') {
            if (endTurn) {
                let nextP = myPlayerNum === 1 ? 2 : 1; let nextHasMoves = false; let myHasMoves = false;
                for(let i=0; i<64; i++) {
                    if (state.board[i] === 0) {
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
        }

        if (window.currentGame.mode === 'local') {
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) window.currentGame.currentLocalTurn = window.currentGame.currentLocalTurn === 1 ? 2 : 1;
            if (winnerNum !== 0) {
                window.currentGame.winningLine = winningLine;
                handleGameOverResult(winnerNum);
            }
            
            renderGameBoard();

            // Disparar movimiento de la PC si es su turno
            if (window.currentGame.vsPC && window.currentGame.currentLocalTurn === 2 && window.currentGame.status === 'playing' && endTurn) {
                setTimeout(makePCMove, 800); // Retardo de 800ms para que la PC "piense"
            }
        } else if (window.currentGame.mode === 'multi') {
            socket.emit('make_move', { room: window.currentGame.roomId, gameState: state, winnerNum: winnerNum, endTurn: endTurn, winningLine: winningLine });
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) { window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1; }
            if (winnerNum !== 0) {
                window.currentGame.winningLine = winningLine;
                handleGameOverResult(winnerNum);
            }
            renderGameBoard();
        }
    }
}

/**
 * [MÓDULO: GAME_CORE]
 * Restablece las variables temporales de la pieza seleccionada (solo para Damas).
 */
function resetSelection() { localSelection = { selectedPiece: null, validMoves: [], multiJumping: false }; }

/**
 * [MÓDULO: GAME_CORE]
 * Finaliza la partida, muestra los resultados visuales, abre el modal de Fin de Juego
 * y actualiza las estadísticas (LocalStorage) si fue un juego contra la PC.
 * @param {number} winnerNum - El número del jugador que ganó o -1 si hubo empate.
 */
function handleGameOverResult(winnerNum) {
    window.currentGame.status = 'finished';
    let msg = ""; let modalHeader = document.getElementById('goHeader');
    if(winnerNum === -1) { msg = "¡Ha sido un Empate!"; modalHeader.className = "modal-header border-bottom-0 justify-content-center text-warning"; }
    else if (winnerNum === window.currentGame.myPlayerNum || (window.currentGame.mode === 'local' && winnerNum === 1)) { msg = "¡Felicidades! Has Ganado."; modalHeader.className = "modal-header border-bottom-0 justify-content-center text-success"; } 
    else { msg = "¡Has perdido la partida!"; modalHeader.className = "modal-header border-bottom-0 justify-content-center text-danger"; }
    document.getElementById('goMessage').innerText = msg;

    // ESTADÍSTICAS VS PC EN LOCALSTORAGE
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

    if(bsGameOverModal) bsGameOverModal.show();
}

/**
 * [MÓDULO: GAME_CORE]
 * Función conectada al botón de "Abandonar" en el tablero. Pide confirmación nativa.
 */
window.confirmSurrender = () => { if(confirm("¿Estás seguro de que deseas abandonar la partida actual?")) { closeGameOver(); } }

/**
 * [MÓDULO: GAME_CORE]
 * Oculta el tablero, borra el juego actual de la memoria y regresa a la interfaz principal (Lobby).
 */
window.closeGameOver = () => { if(bsGameOverModal) bsGameOverModal.hide(); window.currentGame = null; document.getElementById('game-view').style.display = 'none'; document.getElementById('lobby-view').style.display = 'flex'; }

// [MÓDULO: GAME_CORE] Escucha los movimientos recibidos del servidor para juego Online
socket.on('update_board', (data) => {
    if (window.currentGame && window.currentGame.mode === 'multi') {
        window.currentGame.gameState = data.gameState;
        if (data.endTurn && data.winnerNum === 0) { window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1; }
        if (data.winnerNum !== 0) {
            window.currentGame.winningLine = data.winningLine || [];
        }
        renderGameBoard(); 
        if (data.winnerNum !== 0) handleGameOverResult(data.winnerNum);
    }
});

// [MÓDULO: GAME_CORE] Al recibir que el servidor emparejó a los 2, carga el tablero vacío.
socket.on('game_started', (data) => {
    window.currentGame = { mode: 'multi', gameType: data.gameType, status: 'playing', roomId: data.roomId, turn: 1, myPlayerNum: data.myPlayerNum, opponent: data.opponent };
    window.currentGame.gameState = getInitialState(data.gameType);
    document.getElementById('lobby-view').style.display = 'none'; document.getElementById('game-view').style.display = 'block';
    renderGameBoard();
});

// ==========================================
// [MÓDULO: NETWORK] - SISTEMA DE RECONEXIÓN (ANTISUSPENSIÓN)
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
        const modalHtml = `<div class="modal fade" id="disconnectModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"><div class="modal-dialog modal-dialog-centered"><div class="modal-content glass-modal border-warning text-center shadow-lg"><div class="modal-body py-5" id="disconnectModalBody"><i class="bi bi-wifi-off text-warning display-1 mb-3 d-block heartbeat"></i><h3 class="fw-bold text-white" id="disconnectTitle">Problema de Conexión</h3><p class="text-muted" id="disconnectMessage">Se ha perdido la conexión con el servidor.</p><div id="disconnectAction" class="mt-4"></div></div></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml); modalEl = document.getElementById('disconnectModal');
    } return new bootstrap.Modal(modalEl);
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
window.reconectarJuego = () => { document.getElementById('disconnectAction').innerHTML = `<div class="spinner-border text-warning"></div><p class="mt-2 text-muted">Reconectando...</p>`; socket.connect(); };

// [MÓDULO: NETWORK] El servidor nos avisa que la *otra* persona se desconectó temporalmente.
socket.on('opponent_disconnected', () => {
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        if(!disconnectModalInst) disconnectModalInst = getOrCreateDisconnectModal();
        document.getElementById('disconnectTitle').innerText = "Oponente Desconectado";
        document.getElementById('disconnectMessage').innerHTML = `<strong>${window.currentGame.opponent}</strong> tiene problemas de conexión.<br>Por favor, espera en esta pantalla a que reanude el juego...`;
        document.getElementById('disconnectAction').innerHTML = `<div class="spinner-grow text-warning" role="status"></div><p class="mt-2 small text-muted">Esperando reconexión...</p>`;
        disconnectModalInst.show();
    }
});

// [MÓDULO: NETWORK] Cuando logramos volver a engancharnos a la red tras una desconexión.
socket.on('connect', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') { socket.emit('resume_game', { room: window.currentGame.roomId }); }
});

// [MÓDULO: NETWORK] El servidor nos avisa que la otra persona ya volvió; le pasamos nuestro estado para sincronizarlo.
socket.on('opponent_reconnected', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    if (window.currentGame && window.currentGame.mode === 'multi') { socket.emit('sync_state', { room: window.currentGame.roomId, gameState: window.currentGame.gameState, turn: window.currentGame.turn }); }
});

// [MÓDULO: NETWORK] Recibimos el estado de la partida desde el otro jugador después de reconectarnos.
socket.on('receive_sync', (data) => {
    if (window.currentGame && window.currentGame.mode === 'multi') { window.currentGame.gameState = data.gameState; window.currentGame.turn = data.turn; renderGameBoard(); }
});