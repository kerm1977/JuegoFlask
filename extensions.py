# Nombre: extensions.py
# Ubicación: / (Directorio raíz del proyecto)

# Instanciamos las extensiones aquí para evitar importaciones circulares (Circular Imports)
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_socketio import SocketIO

db = SQLAlchemy()
bcrypt = Bcrypt()
login_manager = LoginManager()
socketio = SocketIO()