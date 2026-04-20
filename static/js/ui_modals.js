// Nombre: ui_modals.js
// Ubicación: static/js/
// Función: Gestiona alertas, modales, inyecciones de CSS y efectos visuales de la UI.

window.bsGameOverModal = null;

document.addEventListener("DOMContentLoaded", () => {
    const goModalEl = document.getElementById('gameOverModal');
    if (goModalEl) {
        window.bsGameOverModal = new bootstrap.Modal(goModalEl);
        
        // Buscar y cambiar "Volver a jugar" por "Retar"
        const elementos = goModalEl.querySelectorAll('*');
        elementos.forEach(el => {
            el.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && /Volver a [Jj]ugar/i.test(node.nodeValue)) {
                    node.nodeValue = node.nodeValue.replace(/Volver a [Jj]ugar/i, 'Retar');
                    
                    if (node.parentElement && (node.parentElement.tagName === 'BUTTON' || node.parentElement.tagName === 'A')) {
                        node.parentElement.addEventListener('click', () => {
                            if (window.bsGameOverModal) window.bsGameOverModal.hide();
                            
                            if (window.currentGame && window.currentGame.mode === 'multi') {
                                if (typeof window.mostrarEsperandoRetador === 'function') {
                                    window.mostrarEsperandoRetador();
                                }
                            }
                        });
                    }
                }
            });
        });
    }

    if (!document.getElementById('mobileGameOverFix')) {
        const cssFix = document.createElement('style');
        cssFix.id = 'mobileGameOverFix';
        cssFix.innerHTML = `
            #gameOverModal .modal-dialog { margin-top: 10px !important; }
            @media (max-width: 576px) {
                #gameOverModal .mt-4, #gameOverModal .mb-4, #gameOverModal .my-4,
                #gameOverModal .mt-3, #gameOverModal .mb-3, #gameOverModal .my-3 { margin-top: 0 !important; margin-bottom: 0 !important; }
                #gameOverModal .modal-body, #gameOverModal .modal-header { padding: 0.5rem !important; border-bottom: none !important; }
                #goHeader::after, #gameOverModal .modal-header::after {
                    content: ""; display: block; width: 100%; height: 1px; background-color: rgba(255, 255, 255, 0.15); margin-top: 0.5rem; margin-bottom: 0.5rem;
                }
                #goHeader, #gameOverModal .modal-header { padding-bottom: 0 !important; border-bottom: none !important; flex-direction: column; }
                #gameOverModal .modal-body > div:last-child, #gameOverModal .d-flex.justify-content-center, #pcStatsContainer {
                    flex-wrap: nowrap !important; gap: 0.25rem !important; justify-content: space-between !important; margin-top: 0 !important; margin-bottom: 0 !important;
                }
                #gameOverModal .btn {
                    font-size: 0.75rem !important; padding: 0.4rem 0.2rem !important; white-space: nowrap !important; flex: 1; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important;
                }
            }
        `;
        document.head.appendChild(cssFix);
    }
    
    if (!document.getElementById('dayVisibilityFix')) {
        const lightCss = document.createElement('style');
        lightCss.id = 'dayVisibilityFix';
        lightCss.innerHTML = `
            .glass-panel, .glass-modal { background: rgba(50, 55, 75, 0.95) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.05) !important; }
            .game-board.glass-panel { background: rgba(60, 65, 90, 0.95) !important; }
            .text-muted { color: #ced4da !important; }
        `;
        document.head.appendChild(lightCss);
    }
    
    const gameView = document.getElementById('game-view');
    const bottomBar = document.querySelector('.mobile-bottom-bar');
    
    if (gameView) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (gameView.style.display === 'block') {
                        if (bottomBar) bottomBar.style.display = 'none'; 
                        try {
                            if (window.bsGameOverModal) window.bsGameOverModal.hide();
                            if (typeof Swal !== 'undefined') Swal.close();
                            if (typeof swal !== 'undefined') swal.close();
                            
                            ['waitingModal', 'waitingChallengerModal', 'abandonModal'].forEach(id => {
                                const mEl = document.getElementById(id);
                                if (mEl) { const mod = bootstrap.Modal.getInstance(mEl); if (mod) mod.hide(); }
                            });
                            
                            document.body.classList.remove('modal-open'); document.body.style.overflow = ''; document.body.style.paddingRight = '';
                            document.querySelectorAll('.modal-backdrop, .swal2-container').forEach(el => el.remove());
                        } catch (e) {}
                    } else {
                        if (bottomBar) bottomBar.style.display = 'flex'; 
                    }
                }
            });
        });
        observer.observe(gameView, { attributes: true });
    }
});

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
    const inst = new bootstrap.Modal(modalEl); inst.show();
};

window.mostrarModalAbandono = (nombreOponente) => {
    if (window.bsGameOverModal) window.bsGameOverModal.hide();
    ['waitingModal', 'waitingChallengerModal', 'pcConfigModal'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { let inst = bootstrap.Modal.getInstance(el); if (inst) inst.hide(); }
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
                        <button class="btn btn-outline-danger rounded-pill mt-4 px-4 shadow-sm" onclick="window.cerrarAbandono()">Volver al Menú</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('abandonModal');
    }
    
    let targetName = nombreOponente || (window.currentGame ? window.currentGame.opponent : 'El oponente');
    document.getElementById('abandonModalMessage').innerHTML = `<strong class="text-warning">${targetName}</strong> ha abandonado la partida o rechazado el reto.`;
    
    const abandonInst = new bootstrap.Modal(modalEl); abandonInst.show();
};

window.cerrarAbandono = () => {
    let modalEl = document.getElementById('abandonModal');
    if (modalEl) { let inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
    if (typeof window.closeGameOver === 'function') window.closeGameOver();
};

if (typeof socket !== 'undefined') {
    socket.on('opponent_abandoned', (data) => window.mostrarModalAbandono(data ? data.username : null));
    socket.on('player_left', (data) => window.mostrarModalAbandono(data ? data.username : null));
    socket.on('reto_rechazado', (data) => {
        if (window.currentGame && window.currentGame.status === 'finished') window.mostrarModalAbandono(data ? (data.target || data.retado) : null);
    });
    socket.on('reto_cancelado', (data) => window.mostrarModalAbandono(data ? data.username : null));
}