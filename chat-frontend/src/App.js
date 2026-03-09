import React, { useState, useEffect } from 'react';
import { Widget, addResponseMessage } from 'react-chat-widget';
import io from 'socket.io-client';

import 'react-chat-widget/lib/styles.css';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [inputName, setInputName] = useState('');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to backend');
    });

    socket.on('username_assigned', (data) => {
      setUsername(data.username);
      if (!joined) {
        addResponseMessage(`You are now known as ${data.username}`);
      }
    });

    socket.on('my response', (msg) => {
      const senderUsername = msg.username || 'System';
      const messageText = msg.data;
      addResponseMessage(`${senderUsername}: ${messageText}`);
    });

    return () => {
      socket.off('connect');
      socket.off('username_assigned');
      socket.off('my response');
    };
  }, [joined]);

  const handleJoin = (e) => {
    e.preventDefault();
    const name = (inputName || '').trim();
    if (!name) return;
    socket.emit('set_username', { username: name });
    setJoined(true);
  };

  const handleNewUserMessage = (newMessage) => {
    socket.emit('my message', { data: newMessage });
  };

  if (!joined) {
    return (
      <div className="App">
        <form className="join-form" onSubmit={handleJoin}>
          <label htmlFor="username">Choose your username</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            maxLength={32}
            autoFocus
          />
          <button type="submit">Join chat</button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <Widget
        handleNewUserMessage={handleNewUserMessage}
        title={`Chat – ${username}`}
        subtitle="Connected"
      />
    </div>
  );
}

export default App;
