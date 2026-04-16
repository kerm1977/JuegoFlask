// ✂️ ========================================================= ✂️
// ✂️ ARCHIVO 1: auth.js                                        ✂️
// ✂️ CORTA DESDE AQUÍ ABAJO                                    ✂️
// ✂️ ========================================================= ✂️

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


// ✂️ ========================================================= ✂️
// ✂️ FIN DEL ARCHIVO 1: auth.js                                ✂️
// ✂️ ========================================================= ✂️
