# Nombre: models.py
# Ubicación: / (Directorio raíz del proyecto)

from extensions import db
from flask_login import UserMixin

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    pin = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_superuser = db.Column(db.Boolean, default=False)

class Game(db.Model):
    __tablename__ = 'games'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(50), default="waiting") # waiting, active, finished
    # Puedes añadir más campos como current_players, max_players, etc.