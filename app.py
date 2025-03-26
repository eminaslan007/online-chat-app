from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'gizli-anahtar-123')
socketio = SocketIO(app, cors_allowed_origins="*")

# Aktif kullanıcıları takip etmek için
active_users = set()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    emit('user_count', {'count': len(active_users)}, broadcast=True)

@socketio.on('join')
def handle_join(data):
    username = data.get('username')
    if username:
        active_users.add(username)
        emit('user_joined', {'username': username, 'count': len(active_users)}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    emit('user_count', {'count': len(active_users)}, broadcast=True)

@socketio.on('leave')
def handle_leave(data):
    username = data.get('username')
    if username and username in active_users:
        active_users.remove(username)
        emit('user_left', {'username': username, 'count': len(active_users)}, broadcast=True)

@socketio.on('mesaj')
def handle_message(data):
    emit('mesaj', data, broadcast=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)
