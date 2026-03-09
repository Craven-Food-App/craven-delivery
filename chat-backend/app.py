from flask import Flask, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}


@socketio.on("connect")
def handle_connect():
    sid = request.sid
    users[sid] = "Guest" + str(len(users) + 1)
    print(f"Client connected: {sid} as {users[sid]}")
    emit("username_assigned", {"username": users[sid]})


@socketio.on("set_username")
def handle_set_username(json):
    sid = request.sid
    new_username = (json.get("username") or "").strip() or users.get(sid, "Guest")
    old_username = users.get(sid, "Guest")
    users[sid] = new_username
    emit("my response", {"data": f"{new_username} has joined the chat."}, broadcast=True)
    emit("username_assigned", {"username": new_username})


@socketio.on("my message")
def handle_my_message(json):
    sid = request.sid
    username = users.get(sid, "Unknown")
    message = json.get("data", "")
    print(f"Received from {username} ({sid}): {message}")
    emit("my response", {"data": message, "username": username}, broadcast=True)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    username = users.pop(sid, "Unknown")
    print(f"Client disconnected: {sid} ({username})")
    emit("my response", {"data": f"{username} has left the chat."}, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, debug=True)
