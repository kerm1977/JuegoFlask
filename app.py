# Nombre: app.py
# Ubicación: / (Directorio raíz del proyecto)

from flask import Flask
from extensions import db, bcrypt, login_manager, socketio
from models import User
from users import users_bp
from games import games_bp
from datetime import timedelta
import os

def create_app():
    app = Flask(__name__)
    
    # Configuraciones Globales
    app.config['SECRET_KEY'] = 'la-tribu-super-secreta-2026'
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'games_database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Configuración: Sesión abierta por 24 horas a menos que se haga logout
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

    # Inicialización de extensiones
    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    login_manager.login_view = 'users.login'
    login_manager.login_message = "Por favor inicia sesión para acceder a esta página."

    # Registro de Blueprints
    app.register_blueprint(users_bp)
    app.register_blueprint(games_bp)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Creación automática de la BD e inyección de Superusuarios
    with app.app_context():
        db.create_all()
        inject_superusers()

    return app

def inject_superusers():
    """Inyecta los superusuarios la primera vez que se crea la BD."""
    superusers = ['kenth1977@gmail.com', 'lthikingcr@gmail.com']
    hashed_pw = bcrypt.generate_password_hash('CR129x7848n').decode('utf-8')
    
    for email in superusers:
        if not User.query.filter_by(email=email).first():
            user = User(
                username=email.split('@')[0], 
                email=email, 
                pin='0000', 
                password_hash=hashed_pw, 
                is_superuser=True
            )
            db.session.add(user)
            print(f"[*] Superusuario inyectado: {email}")
            
    db.session.commit()

# Entry point para arrancar con SocketIO
if __name__ == '__main__':
    app = create_app()
    # Se utiliza el puerto 5001 según la configuración del Lanzador Tailscale
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)