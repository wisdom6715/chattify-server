import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import functions
import { handleUserConnection } from './functions/userConnection.js';
import { handleSendMessage } from './functions/sendMessage.js';
import { handleJoinRoom } from './functions/joinRoom.js';
import { handleLeaveRoom } from './functions/leaveRoom.js';
import { getMessages } from './functions/getMessages.js';
import { getRooms } from './functions/getRooms.js';
import { createRoom } from './functions/createRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(join(__dirname, 'public')));

app.get('/page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page.html'));
});

// In-memory storage (for demo purposes - in production use a database)
export const rooms = new Map();
export const users = new Map();
export const messages = new Map();

// REST API Routes
app.get('/api/rooms', (req, res) => {
  const roomList = getRooms();
  res.json({ success: true, rooms: roomList });
});

app.post('/api/rooms', (req, res) => {
  const { roomName, userId } = req.body;
  
  if (!roomName || !userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Room name and user ID are required' 
    });
  }

  const room = createRoom(roomName, userId);
  res.json({ success: true, room });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const roomMessages = getMessages(roomId);
  res.json({ success: true, messages: roomMessages });
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username is required' 
    });
  }

  const userId = Date.now().toString();
  const user = { id: userId, username, online: false };
  users.set(userId, user);
  
  res.json({ success: true, user });
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user connection with user info
  socket.on('user_connected', (userData) => {
    handleUserConnection(socket, userData, users, io);
  });

  // Handle joining a room
  socket.on('join_room', (data) => {
    handleJoinRoom(socket, data, rooms, users, io);
  });

  // Handle leaving a room
  socket.on('leave_room', (data) => {
    handleLeaveRoom(socket, data, rooms, users, io);
  });

  // Handle sending messages
  socket.on('send_message', (messageData) => {
    handleSendMessage(socket, messageData, messages, rooms, io);
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: false
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Update user status to offline
    for (const [userId, user] of users.entries()) {
      if (user.socketId === socket.id) {
        user.online = false;
        users.set(userId, user);
        
        // Notify all rooms this user was in
        for (const [roomId, room] of rooms.entries()) {
          if (room.participants.includes(userId)) {
            socket.to(roomId).emit('user_status_changed', {
              userId,
              username: user.username,
              online: false
            });
          }
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3090;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});