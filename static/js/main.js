// Nombre: main.js
// Ubicación: static/js/

// ==========================================
// AUTENTICACIÓN Y LLAVES JSON
// ==========================================

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

function descargarLlave(keyData) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(keyData, null, 4));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "llave_acceso_latribu.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

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
// CONEXIÓN SOCKET.IO Y SISTEMA DE RETOS
// ==========================================
const socket = io({
    reconnection: true,             // Habilitar reconexión automática
    reconnectionAttempts: Infinity, // Intentar infinitamente
    reconnectionDelay: 1000         // Empezar a intentar cada 1 segundo
});

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

window.solicitarListaJugadores = () => {
    if(!window.CURRENT_USERNAME) { alert("Debes iniciar sesión para ver los jugadores."); return; }
    document.getElementById('playersListContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-info"></div></div>';
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

window.prepararReto = (username) => {
    targetUserToChallenge = username;
    if(playersModalInst) playersModalInst.hide();
    if(selectGameModalInst) selectGameModalInst.show();
};

window.enviarReto = (gameType) => {
    if(selectGameModalInst) selectGameModalInst.hide();
    socket.emit('enviar_reto', { target: targetUserToChallenge, game_type: gameType });
    alert(`Reto enviado a ${targetUserToChallenge}. Esperando respuesta...`);
};

// ==========================================
// SISTEMA DE ESTADÍSTICAS Y PAGINACIÓN
// ==========================================
window.currentStatsData = [];
window.currentStatsPage = 1;

function getOrCreateStatsModal() {
    let modalEl = document.getElementById('statsModal');
    if (!modalEl) {
        const modalHtml = `
        <div class="modal fade" id="statsModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content glass-modal border-info">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-info" id="statsModalTitle"><i class="bi bi-bar-chart-fill"></i> Estadísticas</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="if(playersModalInst) playersModalInst.show()"></button>
                    </div>
                    <div class="modal-body" id="statsModalBody">
                        <div class="text-center"><div class="spinner-border text-info"></div> Cargando...</div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('statsModal');
    }
    if(!statsModalInst) statsModalInst = new bootstrap.Modal(modalEl);
    return statsModalInst;
}

window.verEstadisticas = (username) => {
    if(playersModalInst) playersModalInst.hide();
    const statsModal = getOrCreateStatsModal();
    document.getElementById('statsModalTitle').innerHTML = `<i class="bi bi-person-circle"></i> Stats de ${username}`;
    document.getElementById('statsModalBody').innerHTML = '<div class="text-center my-4"><div class="spinner-border text-info"></div><p class="mt-2 text-muted">Buscando el historial...</p></div>';
    statsModal.show();
    socket.emit('solicitar_estadisticas', { username: username });
};

socket.on('recibir_estadisticas', (data) => {
    const body = document.getElementById('statsModalBody');
    if(!body) return;
    
    // Agrupar historial por oponente y juego
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
    
    // Convertir el diccionario agrupado a un array para poder paginarlo
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
        <div class="mt-4 text-center">
            <button class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal" onclick="if(playersModalInst) playersModalInst.show()"><i class="bi bi-arrow-left"></i> Volver a Jugadores</button>
        </div>
    `;
    
    body.innerHTML = headerHtml;
    renderStatsPage(1); // Renderizamos la primera página (10 items)
});

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

    // Controles de paginación
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
// OVERLAY GIGANTE: RECIBIR RETO
// ==========================================
socket.on('recibir_reto', (data) => {
    currentChallenger = data.retador;
    currentGameToPlay = data.game_type;
    
    let gameName = data.game_type === 'gato' ? 'Gato' : (data.game_type === '4linea' ? '4 en Línea' : 'Damas');
    document.getElementById('retadorNombre').innerHTML = `<strong>${currentChallenger}</strong> te ha retado a una partida de <strong>${gameName}</strong>.`;
    
    document.getElementById('retoOverlay').style.display = 'flex';
});

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

window.confirmarRechazo = () => {
    document.getElementById('retoOverlay').style.display = 'none';
    if(rechazarModalInst) rechazarModalInst.show();
};

window.cancelarRechazo = () => {
    if(rechazarModalInst) rechazarModalInst.hide();
    document.getElementById('retoOverlay').style.display = 'flex';
};

socket.on('reto_rechazado', (data) => {
    alert(`El jugador ${data.retado} ha rechazado tu reto. ¡Qué gallina! 🐔`);
});

// ==========================================
// REGLAS Y LÓGICA DE JUEGOS
// ==========================================

window.currentGame = null; 
let localSelection = { selectedPiece: null, validMoves: [], multiJumping: false };
let bsGameOverModal;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('gameOverModal')) {
        bsGameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
    }
});

function getInitialState(type) {
    if(type === 'gato') return { board: Array(9).fill(0) };
    if(type === '4linea') return { board: Array(42).fill(0) }; 
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

window.startLocalGame = (type) => {
    window.currentGame = { mode: 'local', gameType: type, status: 'playing', currentLocalTurn: 1, gameState: getInitialState(type) };
    document.getElementById('lobby-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'block';
    renderGameBoard();
};

window.renderGameBoard = () => {
    if(!window.currentGame) return;
    const boardDiv = document.getElementById('gameBoard');
    const type = window.currentGame.gameType;
    const state = window.currentGame.gameState;
    
    let gameName = type === 'gato' ? 'Gato (Tic Tac Toe)' : type === '4linea' ? '4 en Línea' : 'Damas Clásicas';
    document.getElementById('gameTitle').innerText = gameName;
    
    let isMyTurn, myPlayerNum, indicatorText, indicatorClass;

    if (window.currentGame.mode === 'local') {
        const j = window.currentGame.currentLocalTurn;
        isMyTurn = true; 
        myPlayerNum = j;
        indicatorText = `Turno: ${j === 1 ? 'Jugador 1 (Rojo)' : 'Jugador 2 (Azul)'}`;
        indicatorClass = j === 1 ? "text-danger fw-bold" : "text-info fw-bold";
    } else if (window.currentGame.mode === 'multi') {
        myPlayerNum = window.currentGame.myPlayerNum;
        isMyTurn = (window.currentGame.turn === myPlayerNum);
        
        if (isMyTurn) {
            indicatorText = "¡Es tu turno!";
            indicatorClass = myPlayerNum === 1 ? "text-danger fw-bold" : "text-info fw-bold";
        } else {
            indicatorText = `Turno de ${window.currentGame.opponent || 'tu oponente'}...`;
            indicatorClass = "text-muted";
        }
    }

    let indicator = document.getElementById('turnIndicator');
    if(indicator) {
        indicator.innerText = indicatorText; 
        indicator.className = indicatorClass;
    }
    
    boardDiv.innerHTML = '';
    boardDiv.className = `game-board glass-panel grid-${type==='gato'?'3x3':type==='4linea'?'7x6':'8x8'}`;

    if(type === 'gato') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell shadow-sm';
            d.innerText = cell === 1 ? 'X' : cell === 2 ? 'O' : '';
            if(cell === 1) d.style.color = '#ff0055'; if(cell === 2) d.style.color = '#0dcaf0';
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn);
            boardDiv.appendChild(d);
        });
    } else if (type === '4linea') {
        state.board.forEach((cell, i) => {
            let d = document.createElement('div'); d.className = 'cell bg-primary p-1';
            let circle = document.createElement('div');
            circle.className = `c4-cell ${cell===1?'c4-p1':cell===2?'c4-p2':''}`;
            d.appendChild(circle);
            d.onclick = () => attemptMove(i % 7, myPlayerNum, isMyTurn);
            boardDiv.appendChild(d);
        });
    } else if (type === 'damas') {
        state.board.forEach((cell, i) => {
            let row = Math.floor(i/8); let col = i%8; let d = document.createElement('div');
            let isDark = (row+col)%2 !== 0; d.className = `cell ${isDark ? 'chk-dark' : 'chk-light'}`;
            if (isMyTurn && localSelection.validMoves.includes(i)) { d.classList.add('valid-move'); d.style.cursor = 'pointer'; }
            if(cell !== 0) {
                let piece = document.createElement('div');
                piece.className = `chk-piece ${cell===1 || cell===3 ? 'chk-p1' : 'chk-p2'}`;
                if(cell>2) piece.innerText = '♚'; 
                if(isMyTurn && localSelection.selectedPiece === i) piece.style.transform = "scale(1.15)";
                d.appendChild(piece);
            }
            d.onclick = () => attemptMove(i, myPlayerNum, isMyTurn);
            boardDiv.appendChild(d);
        });
    }
};

function attemptMove(index, myPlayerNum, isMyTurn) {
    if(!isMyTurn || window.currentGame.status !== 'playing') return;
    
    let state = JSON.parse(JSON.stringify(window.currentGame.gameState)); 
    let type = window.currentGame.gameType;
    let validMove = false; let endTurn = true; 

    if(type === 'gato') {
        if(state.board[index] === 0) { state.board[index] = myPlayerNum; validMove = true; }
    } else if (type === '4linea') {
        for(let r=5; r>=0; r--) { 
            let i = r*7 + index; 
            if(state.board[i] === 0) { state.board[i] = myPlayerNum; validMove = true; break; }
        }
    } else if (type === 'damas') {
        if (!localSelection.multiJumping && (state.board[index] === myPlayerNum || state.board[index] === myPlayerNum + 2)) {
            localSelection.selectedPiece = index; 
            localSelection.validMoves = getValidCheckersMoves(state.board, index, myPlayerNum, false);
            renderGameBoard(); return; 
        } 
        else if (localSelection.selectedPiece !== null && localSelection.validMoves.includes(index)) {
            let isJump = Math.abs(Math.floor(localSelection.selectedPiece / 8) - Math.floor(index / 8)) === 2;
            if (isJump) { 
                let r1 = Math.floor(localSelection.selectedPiece / 8), c1 = localSelection.selectedPiece % 8;
                let r2 = Math.floor(index / 8), c2 = index % 8;
                state.board[((r1 + r2) / 2) * 8 + ((c1 + c2) / 2)] = 0; 
            }
            state.board[index] = state.board[localSelection.selectedPiece];
            state.board[localSelection.selectedPiece] = 0;
            
            let promoted = false; 
            if (myPlayerNum === 1 && Math.floor(index / 8) === 0 && state.board[index] === 1) { state.board[index] = 3; promoted = true; }
            if (myPlayerNum === 2 && Math.floor(index / 8) === 7 && state.board[index] === 2) { state.board[index] = 4; promoted = true; }
            
            if (isJump && !promoted) {
                let furtherJumps = getValidCheckersMoves(state.board, index, myPlayerNum, true);
                if (furtherJumps.length > 0) {
                    localSelection.selectedPiece = index; localSelection.validMoves = furtherJumps;
                    localSelection.multiJumping = true; endTurn = false; validMove = true;
                } else { resetSelection(); validMove = true; }
            } else { resetSelection(); validMove = true; }
        }
    }

    if(validMove) {
        let winnerNum = 0;
        if(type === 'gato') {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for(let l of lines) { if(state.board[l[0]] && state.board[l[0]] === state.board[l[1]] && state.board[l[0]] === state.board[l[2]]) winnerNum = state.board[l[0]]; }
            if(!winnerNum && !state.board.includes(0)) winnerNum = -1; 
        } else if (type === '4linea') { winnerNum = checkC4Win(state.board); }
        else if (type === 'damas') {
            let p1 = state.board.filter(p => p===1 || p===3).length;
            let p2 = state.board.filter(p => p===2 || p===4).length;
            if(p1 === 0) winnerNum = 2; else if(p2 === 0) winnerNum = 1;
        }

        if (window.currentGame.mode === 'local') {
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) window.currentGame.currentLocalTurn = window.currentGame.currentLocalTurn === 1 ? 2 : 1;
            if (winnerNum !== 0) handleGameOverResult(winnerNum);
            renderGameBoard();
            
        } else if (window.currentGame.mode === 'multi') {
            socket.emit('make_move', {
                room: window.currentGame.roomId,
                gameState: state,
                winnerNum: winnerNum,
                endTurn: endTurn
            });
            
            window.currentGame.gameState = state;
            if (endTurn && winnerNum === 0) {
                 window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1;
            }
            if (winnerNum !== 0) handleGameOverResult(winnerNum);
            renderGameBoard();
        }
    }
}

function resetSelection() { localSelection = { selectedPiece: null, validMoves: [], multiJumping: false }; }

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

function checkC4Win(b) {
    for(let r=0; r<6; r++) {
        for(let c=0; c<7; c++) {
            let p = b[r*7+c]; if(p === 0) continue;
            if(c<=3 && p===b[r*7+c+1] && p===b[r*7+c+2] && p===b[r*7+c+3]) return p;
            if(r<=2 && p===b[(r+1)*7+c] && p===b[(r+2)*7+c] && p===b[(r+3)*7+c]) return p;
            if(r<=2 && c<=3 && p===b[(r+1)*7+c+1] && p===b[(r+2)*7+c+2] && p===b[(r+3)*7+c+3]) return p;
            if(r<=2 && c>=3 && p===b[(r+1)*7+c-1] && p===b[(r+2)*7+c-2] && p===b[(r+3)*7+c-3]) return p;
        }
    } return b.includes(0) ? 0 : -1;
}

function handleGameOverResult(winnerNum) {
    window.currentGame.status = 'finished';
    let msg = ""; let modalHeader = document.getElementById('goHeader');
    if(winnerNum === -1) {
        msg = "¡Ha sido un Empate!";
        modalHeader.className = "modal-header border-bottom-0 justify-content-center text-warning";
    } else if (winnerNum === window.currentGame.myPlayerNum || (window.currentGame.mode === 'local' && winnerNum === 1)) {
        msg = "¡Felicidades! Has Ganado.";
        modalHeader.className = "modal-header border-bottom-0 justify-content-center text-success";
    } else {
        msg = "¡Has perdido la partida!";
        modalHeader.className = "modal-header border-bottom-0 justify-content-center text-danger";
    }
    document.getElementById('goMessage').innerText = msg;
    if(bsGameOverModal) bsGameOverModal.show();
}

window.confirmSurrender = () => {
    if(confirm("¿Estás seguro de que deseas abandonar la partida actual?")) {
        closeGameOver();
    }
}

window.closeGameOver = () => { 
    if(bsGameOverModal) bsGameOverModal.hide(); 
    window.currentGame = null; 
    document.getElementById('game-view').style.display = 'none';
    document.getElementById('lobby-view').style.display = 'flex';
}

socket.on('update_board', (data) => {
    if (window.currentGame && window.currentGame.mode === 'multi') {
        window.currentGame.gameState = data.gameState;
        if (data.endTurn && data.winnerNum === 0) {
             window.currentGame.turn = window.currentGame.turn === 1 ? 2 : 1;
        }
        renderGameBoard(); 
        if (data.winnerNum !== 0) handleGameOverResult(data.winnerNum);
    }
});

socket.on('game_started', (data) => {
    window.currentGame = {
        mode: 'multi',
        gameType: data.gameType,
        status: 'playing',
        roomId: data.roomId,
        turn: 1, 
        myPlayerNum: data.myPlayerNum, 
        opponent: data.opponent,
        gameState: getInitialState(data.gameType)
    };
    
    document.getElementById('lobby-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'block';
    renderGameBoard();
});

// ==========================================
// SISTEMA DE RECONEXIÓN (ANTISUSPENSIÓN)
// ==========================================
let disconnectModalInst = null;

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

// 1. Cuando TÚ te desconectas (Se va el internet o se suspende)
socket.on('disconnect', () => {
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        if(!disconnectModalInst) disconnectModalInst = getOrCreateDisconnectModal();
        document.getElementById('disconnectTitle').innerText = "¡Te has desconectado!";
        document.getElementById('disconnectMessage').innerText = "Tu dispositivo entró en suspensión o perdió señal. El juego está pausado.";
        document.getElementById('disconnectAction').innerHTML = `<button class="btn btn-warning rounded-pill px-4 fw-bold shadow" onclick="reconectarJuego()"><i class="bi bi-arrow-clockwise"></i> Reconectar y Reanudar</button>`;
        disconnectModalInst.show();
    }
});

// Botón para forzar reconexión
window.reconectarJuego = () => {
    document.getElementById('disconnectAction').innerHTML = `<div class="spinner-border text-warning"></div><p class="mt-2 text-muted">Reconectando...</p>`;
    socket.connect(); 
};

// 2. Cuando el OPONENTE se desconecta
socket.on('opponent_disconnected', () => {
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        if(!disconnectModalInst) disconnectModalInst = getOrCreateDisconnectModal();
        document.getElementById('disconnectTitle').innerText = "Oponente Desconectado";
        document.getElementById('disconnectMessage').innerHTML = `<strong>${window.currentGame.opponent}</strong> tiene problemas de conexión.<br>Por favor, espera en esta pantalla a que reanude el juego...`;
        document.getElementById('disconnectAction').innerHTML = `<div class="spinner-grow text-warning" role="status"></div><p class="mt-2 small text-muted">Esperando reconexión...</p>`;
        disconnectModalInst.show();
    }
});

// 3. Cuando logras reconectarte con éxito
socket.on('connect', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    
    // Si estábamos en partida, avisarle al servidor para que el oponente nos envíe el tablero actualizado
    if (window.currentGame && window.currentGame.mode === 'multi' && window.currentGame.status === 'playing') {
        socket.emit('resume_game', { room: window.currentGame.roomId });
    }
});

// 4. Cuando el OPONENTE vuelve (Se nos notifica)
socket.on('opponent_reconnected', () => {
    if (disconnectModalInst) { disconnectModalInst.hide(); }
    
    // Nosotros sí tenemos el tablero correcto, se lo pasamos al oponente recién llegado
    if (window.currentGame && window.currentGame.mode === 'multi') {
        socket.emit('sync_state', {
            room: window.currentGame.roomId,
            gameState: window.currentGame.gameState,
            turn: window.currentGame.turn
        });
    }
});

// 5. Recibir el tablero sincronizado (Cuando nosotros éramos los caídos)
socket.on('receive_sync', (data) => {
    if (window.currentGame && window.currentGame.mode === 'multi') {
        window.currentGame.gameState = data.gameState;
        window.currentGame.turn = data.turn;
        renderGameBoard();
    }
});