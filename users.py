# Nombre: users.py
# Ubicación: / (Directorio raíz del proyecto)

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from models import User
from extensions import db, bcrypt, socketio
import json
from jinja2 import TemplateNotFound # <-- NUEVO: Para manejar errores si falta el archivo HTML

users_bp = Blueprint('users', __name__)

@users_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('games.dashboard'))

    if request.method == 'POST':
        # Permitimos iniciar sesión con username o email
        identifier = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
        
        # Validación de usuario y contraseña Bcrypt
        if user and bcrypt.check_password_hash(user.password_hash, password):
            # remember=True preserva la sesión por el tiempo definido (24hrs)
            login_user(user, remember=True)
            
            # Emitir evento de SocketIO para notificar al lobby globalmente
            socketio.emit('server_message', {'msg': f'🎮 ¡{user.username} se ha conectado!'})
            
            return redirect(url_for('games.dashboard'))
            
        flash('Usuario o contraseña incorrectos', 'danger')
        return redirect(url_for('users.login'))

    return render_template('login.html')

@users_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('games.dashboard'))

    if request.method == 'POST':
        data = request.json
        username = data.get('username')
        email = data.get('email')
        pin = data.get('pin')
        password = data.get('password')

        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'El correo ya está registrado.'})

        # Encriptamos fuertemente la contraseña
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        
        new_user = User(username=username, email=email, pin=pin, password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

        # Preparamos los datos de la llave JSON
        key_data = {
            "email": email,
            "pin": pin,
            "key": hashed_pw
        }
        return jsonify({'success': True, 'key_data': key_data})

    return render_template('register.html')

@users_bp.route('/recover', methods=['POST'])
def recover():
    try:
        file = request.files['key_file']
        key_data = json.load(file)
        
        email = key_data.get('email')
        key = key_data.get('key') # Este es el hash encriptado
        
        user = User.query.filter_by(email=email).first()
        
        # Validamos si la llave proporcionada coincide exactamente con el hash de la BD
        if user and user.password_hash == key:
            login_user(user, remember=True)
            return jsonify({'success': True})
            
        return jsonify({'success': False, 'message': 'Llave de recuperación inválida o no corresponde al usuario.'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error al leer el archivo JSON.'})

@users_bp.route('/logout')
@login_required
def logout():
    username = current_user.username
    logout_user()
    
    # Notificar al resto de jugadores que alguien salió
    socketio.emit('server_message', {'msg': f'👋 {username} se ha desconectado.'})
    
    return redirect(url_for('users.login'))

# ==========================================
# RUTAS DE PERFIL Y CAMBIO DE CONTRASEÑA
# ==========================================

@users_bp.route('/profile')
@login_required
def profile():
    """Ruta para cargar la vista del perfil del usuario."""
    try:
        # Intentamos cargar la plantilla
        return render_template('profile.html', user=current_user)
    except TemplateNotFound:
        # Si profile.html no existe en la carpeta templates, evitamos el pantallazo de error
        flash("⚠️ Error: No se encontró el archivo 'profile.html' en la carpeta 'templates'. ¡Asegúrate de haberlo guardado correctamente!", "danger")
        return redirect(url_for('games.dashboard'))

@users_bp.route('/change_password', methods=['POST'])
@login_required
def change_password():
    """Ruta para procesar el cambio de contraseña desde el perfil."""
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    # Validar que la contraseña actual ingresada coincida con la de la BD
    if not bcrypt.check_password_hash(current_user.password_hash, current_password):
        return jsonify({'success': False, 'message': 'La contraseña actual es incorrecta.'})

    # Hashear la nueva contraseña y actualizar la BD
    hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
    current_user.password_hash = hashed_pw
    db.session.commit()

    # Retornar los datos actualizados para forzar la descarga de una nueva llave JSON
    key_data = {
        "email": current_user.email,
        "pin": current_user.pin,
        "key": hashed_pw
    }
    
    return jsonify({
        'success': True, 
        'key_data': key_data, 
        'message': 'Contraseña actualizada exitosamente.'
    })