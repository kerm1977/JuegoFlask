// Nombre: main.js
// Ubicación: static/js/

// ==========================================
// AUTENTICACIÓN Y LLAVES JSON
// ==========================================

// Función para mostrar/ocultar contraseña (El Ojo)
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

// Manejo del Formulario de Registro via AJAX
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
                // Generar y descargar el archivo JSON
                descargarLlave(data.key_data);
                
                // Mostrar el modal obligatorio
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

// Función para procesar la subida del JSON para recuperar contraseña
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
const socket = io();
let currentChallenger = null;
let currentGameToPlay = null;
let targetUserToChallenge = null;
let playersModalInst = null;
let selectGameModalInst = null;
let rechazarModalInst = null;

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('playersModal')) playersModalInst = new bootstrap.Modal(document.getElementById('playersModal'));
    if(document.getElementById('selectGameModal')) selectGameModalInst = new bootstrap.Modal(document.getElementById('selectGameModal'));
    if(document.getElementById('rechazarModal')) rechazarModalInst = new bootstrap.Modal(document.getElementById('rechazarModal'));
});

// Pedir la lista al servidor (ESTA ES LA FUNCIÓN QUE FALTABA)
window.solicitarListaJugadores = () => {
    if(!window.CURRENT_USERNAME) { alert("Debes iniciar sesión para ver los jugadores."); return; }
    document.getElementById('playersListContainer').innerHTML = '<div class="text-center"><div class="spinner-border text-info"></div></div>';
    if(playersModalInst) playersModalInst.show();
    socket.emit('solicitar_jugadores');
};

// Recibir y pintar la lista de jugadores
socket.on('lista_jugadores', (jugadores) => {
    const container = document.getElementById('playersListContainer');
    container.innerHTML = '';
    
    if (jugadores.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay otros jugadores registrados.</p>'; return;
    }

    jugadores.forEach(j => {
        let statusHtml = j.is_online ? '<span class="status-indicator status-online"></span> <span class="text-success small">En línea</span>' 
                                     : '<span class="status-indicator status-offline"></span> <span class="text-muted small">Desconectado</span>';
        
        let btnHtml = j.is_online ? `<button class="btn btn-sm btn-outline-warning rounded-pill" onclick="prepararReto('${j.username}')"><i class="bi bi-lightning-charge-fill"></i> Retar</button>` 
                                  : `<button class="btn btn-sm btn-outline-secondary rounded-pill" disabled>Ausente</button>`;

        container.innerHTML += `
            <div class="player-list-item d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                <div>
                    <strong><i class="bi bi-person-fill text-info"></i> ${j.username}</strong><br>
                    ${statusHtml}
                </div>
                <div>${btnHtml}</div>
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

// OVERLAY GIGANTE: RECIBIR RETO
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