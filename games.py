# Nombre: games.py
# Ubicación: / (Directorio raíz del proyecto)

from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from extensions import socketio
from flask_socketio import emit, join_room, leave_room
from models import User
import uuid

games_bp = Blueprint('games', __name__)

# Diccionario para rastrear quién está en línea y su ID de conexión (SID)
online_users = {} # Formato: {'username': 'socket_sid'}
active_games = {}

@games_bp.route('/')
@games_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

# =========================================
# LÓGICA DE SOCKET.IO (MULTIJUGADOR Y RETOS)
# =========================================

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        # Registrar al usuario como "En línea"
        online_users[current_user.username] = request.sid
        print(f"[*] Usuario conectado: {current_user.username} (SID: {request.sid})")
        
        # Notificar a todos el ingreso y actualizar la lista en tiempo real
        emit('server_message', {'msg': f'¡{current_user.username} ha entrado!'}, broadcast=True)
        emit('online_users_updated', list(online_users.keys()), broadcast=True)
    else:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        if current_user.username in online_users:
            del online_users[current_user.username]
        print(f"[*] Usuario desconectado: {current_user.username}")
        emit('online_users_updated', list(online_users.keys()), broadcast=True)

# -----------------------------------------
# SISTEMA DE JUGADORES Y RETOS
# -----------------------------------------

@socketio.on('solicitar_jugadores')
def send_players_list():
    """Envía la lista absoluta de todos los jugadores en la BD y su estado."""
    if not current_user.is_authenticated: return
    
    all_users = User.query.all()
    players_data = []
    
    for u in all_users:
        if u.username != current_user.username: # Excluirse a uno mismo de la lista
            players_data.append({
                'username': u.username,
                'is_online': u.username in online_users
            })
            
    # Emitir de vuelta solo al usuario que lo solicitó
    emit('lista_jugadores', players_data)

@socketio.on('enviar_reto')
def handle_challenge(data):
    target_user = data.get('target')
    game_type = data.get('game_type')
    
    target_sid = online_users.get(target_user)
    if target_sid:
        # Enviar la notificación GIGANTE solo al usuario retado
        emit('recibir_reto', {
            'retador': current_user.username,
            'game_type': game_type
        }, room=target_sid)
    else:
        emit('server_message', {'msg': f'Error: {target_user} se desconectó.'})

@socketio.on('respuesta_reto')
def handle_challenge_response(data):
    retador_username = data.get('retador')
    aceptado = data.get('aceptado')
    game_type = data.get('game_type')
    
    retador_sid = online_users.get(retador_username)
    
    if not aceptado:
        # Si fue rechazado, notificar al retador
        if retador_sid:
            emit('reto_rechazado', {'retado': current_user.username}, room=retador_sid)
        return

    # Si ACEPTÓ, creamos la sala y empezamos el juego
    if retador_sid:
        room_id = str(uuid.uuid4())
        
        # Unir a ambos a la sala de SocketIO
        join_room(room_id, sid=request.sid) # El retado (Jugador 2)
        join_room(room_id, sid=retador_sid) # El retador (Jugador 1)
        
        # Registrar partida
        active_games[room_id] = {
            'type': game_type,
            'player1': retador_username,
            'player2': current_user.username
        }
        
        # Avisar al retador (Jugador 1 - Rojo/Turno 1)
        emit('game_started', {
            'roomId': room_id,
            'gameType': game_type,
            'myPlayerNum': 1,
            'opponent': current_user.username
        }, room=retador_sid)
        
        # Avisar al retado (Jugador 2 - Azul/Turno 2)
        emit('game_started', {
            'roomId': room_id,
            'gameType': game_type,
            'myPlayerNum': 2,
            'opponent': retador_username
        }, room=request.sid)

# -----------------------------------------
# LÓGICA DE MOVIMIENTOS Y EMPAREJAMIENTO
# -----------------------------------------

@socketio.on('find_match')
def find_match(data):
    # Lógica antigua de Matchmaking mantenida por compatibilidad
    game_type = data.get('game_type')
    room_id = str(uuid.uuid4())
    join_room(room_id)
    emit('game_started', {'roomId': room_id, 'gameType': game_type, 'myPlayerNum': 1}, room=room_id)

@socketio.on('make_move')
def handle_move(data):
    room_id = data.get('room')
    emit('update_board', {
        'gameState': data.get('gameState'),
        'winnerNum': data.get('winnerNum'),
        'endTurn': data.get('endTurn')
    }, room=room_id, include_self=False)