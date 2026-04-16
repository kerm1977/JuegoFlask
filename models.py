# Nombre: models.py
# Ubicación: / (Directorio raíz del proyecto)

from extensions import db
from flask_login import UserMixin
from datetime import datetime

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    pin = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_superuser = db.Column(db.Boolean, default=False)
    
    # --- NUEVO: Campo para la imagen de perfil ---
    # Guardaremos el nombre del archivo. Por defecto será 'default.png'
    avatar = db.Column(db.String(255), default='default.png')

class Game(db.Model):
    __tablename__ = 'games'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(50), default="waiting")

# --- TABLA DE ESTADÍSTICAS ---
class Historial(db.Model):
    __tablename__ = 'historial'
    id = db.Column(db.Integer, primary_key=True)
    jugador_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    oponente = db.Column(db.String(150), nullable=False)
    juego = db.Column(db.String(50), nullable=False)
    resultado = db.Column(db.String(20), nullable=False) # 'Victoria', 'Derrota', 'Empate'
    fecha = db.Column(db.DateTime, default=datetime.utcnow)