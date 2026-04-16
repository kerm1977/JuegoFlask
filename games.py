# Nombre: games.py
# Ubicación: / (Directorio raíz del proyecto)

from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from extensions import socketio, db
from flask_socketio import emit, join_room, leave_room
from models import User, Historial
import uuid

games_bp = Blueprint('games', __name__)

online_users = {} 
active_games = {} 

@games_bp.route('/')
@games_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        online_users[current_user.username] = request.sid
        emit('server_message', {'msg': f'¡{current_user.username} ha entrado!'}, broadcast=True)
        emit('online_users_updated', list(online_users.keys()), broadcast=True)
    else:
        return False

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        for room_id, game in active_games.items():
            if game.get('player1') == current_user.username or game.get('player2') == current_user.username:
                emit('opponent_disconnected', room=room_id)
        
        if current_user.username in online_users:
            del online_users[current_user.username]
            
        emit('online_users_updated', list(online_users.keys()), broadcast=True)


@socketio.on('solicitar_jugadores')
def send_players_list():
    if not current_user.is_authenticated: return
    all_users = User.query.all()
    players_data = []
    
    for u in all_users:
        if u.username != current_user.username:
            players_data.append({
                'username': u.username,
                'is_online': u.username in online_users
            })
    emit('lista_jugadores', players_data)

# --- DATOS 100% REALES DE LA BASE DE DATOS ---
@socketio.on('solicitar_estadisticas')
def enviar_estadisticas(data):
    username = data.get('username')
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return

    # Buscar todo el historial de este usuario, ordenado del más reciente al más antiguo
    historial_db = Historial.query.filter_by(jugador_id=user.id).order_by(Historial.fecha.desc()).all()
    
    victorias = sum(1 for h in historial_db if h.resultado == 'Victoria')
    derrotas = sum(1 for h in historial_db if h.resultado == 'Derrota')
    empates = sum(1 for h in historial_db if h.resultado == 'Empate')
    
    # Preparamos TODAS las partidas para enviarlas (el frontend las agrupa y pagina)
    historial_list = []
    for h in historial_db:
        historial_list.append({
            "oponente": h.oponente,
            "juego": h.juego.upper(),
            "resultado": h.resultado
        })
        
    emit('recibir_estadisticas', {
        'victorias': victorias,
        'derrotas': derrotas,
        'empates': empates,
        'historial': historial_list
    })

@socketio.on('enviar_reto')
def handle_challenge(data):
    target_user = data.get('target')
    game_type = data.get('game_type')
    
    target_sid = online_users.get(target_user)
    if target_sid:
        emit('recibir_reto', {'retador': current_user.username, 'game_type': game_type}, room=target_sid)
    else:
        emit('server_message', {'msg': f'Error: {target_user} se desconectó.'})

@socketio.on('respuesta_reto')
def handle_challenge_response(data):
    retador_username = data.get('retador')
    aceptado = data.get('aceptado')
    game_type = data.get('game_type')
    
    retador_sid = online_users.get(retador_username)
    
    if not aceptado:
        if retador_sid:
            emit('reto_rechazado', {'retado': current_user.username}, room=retador_sid)
        return

    if retador_sid:
        room_id = str(uuid.uuid4())
        join_room(room_id, sid=request.sid) 
        join_room(room_id, sid=retador_sid) 

        active_games[room_id] = {
            'type': game_type,
            'player1': retador_username,
            'player2': current_user.username
        }
        
        emit('game_started', {'roomId': room_id, 'gameType': game_type, 'myPlayerNum': 1, 'opponent': current_user.username}, room=retador_sid)
        emit('game_started', {'roomId': room_id, 'gameType': game_type, 'myPlayerNum': 2, 'opponent': retador_username}, room=request.sid)

# --- GUARDA LA PARTIDA CUANDO ALGUIEN GANA ---
@socketio.on('make_move')
def handle_move(data):
    room_id = data.get('room')
    winner_num = data.get('winnerNum')

    # Si alguien ganó o hubo empate, lo guardamos en la base de datos
    if winner_num != 0 and room_id in active_games:
        game_info = active_games[room_id]
        player1_username = game_info['player1']
        player2_username = game_info['player2']
        game_type = game_info['type']
        
        if winner_num == -1: # Empate
            res_p1, res_p2 = 'Empate', 'Empate'
        elif winner_num == 1: # Gana Player 1 (Rojo)
            res_p1, res_p2 = 'Victoria', 'Derrota'
        elif winner_num == 2: # Gana Player 2 (Azul)
            res_p1, res_p2 = 'Derrota', 'Victoria'

        user1 = User.query.filter_by(username=player1_username).first()
        user2 = User.query.filter_by(username=player2_username).first()

        if user1 and user2:
            # Guardamos los historiales de ambos jugadores
            h1 = Historial(jugador_id=user1.id, oponente=player2_username, juego=game_type, resultado=res_p1)
            h2 = Historial(jugador_id=user2.id, oponente=player1_username, juego=game_type, resultado=res_p2)
            
            db.session.add(h1)
            db.session.add(h2)
            db.session.commit()
        
        # Eliminamos la partida activa para no guardarla por duplicado
        del active_games[room_id]

    emit('update_board', {
        'gameState': data.get('gameState'),
        'winnerNum': winner_num,
        'endTurn': data.get('endTurn')
    }, room=room_id, include_self=False)

@socketio.on('resume_game')
def resume_game(data):
    room_id = data.get('room')
    join_room(room_id)
    emit('opponent_reconnected', room=room_id, include_self=False)

@socketio.on('sync_state')
def sync_state(data):
    room_id = data.get('room')
    emit('receive_sync', data, room=room_id, include_self=False)