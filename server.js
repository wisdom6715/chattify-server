import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv'

// Import Supabase functions
import {
  registerUser,
  getUserById,
  getUserByPhone,
  updateUserOnlineStatus,
  updateUserProfile,
  addFriend,
  removeFriend,
  getUserFriends,
  getRecommendedFriends,
  searchUsers,
  areFriends
} from './functions/supabaseUserManagement.js';

import {
  createGroup,
  getGroupById,
  getUserGroups,
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  updateGroup,
  leaveGroup
} from './functions/supabaseGroupManagement.js';

// Import existing functions (modified for local storage)
import { handleSendMessage } from './functions/sendMessage.js';
import { getMessages } from './functions/getMessages.js';

dotenv.config()
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

// In-memory storage for active connections and messages (messages will be local storage)
export const activeUsers = new Map(); // socketId -> user data
export const messages = new Map(); // roomId -> messages array (for server-side backup)

// ============= USER MANAGEMENT API ROUTES =============

// Register new user
app.post('/api/users/register', async (req, res) => {
  try {
    const { user_name, phone_number } = req.body;
    
    if (!user_name || !phone_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and phone number are required' 
      });
    }

    const result = await registerUser({ user_name, phone_number });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get user by ID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserById(userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Search users
app.get('/api/users/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { exclude } = req.query;
    
    const result = await searchUsers(query, exclude);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get user by phone number
app.get('/api/users/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const result = await getUserByPhone(phoneNumber);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Update user profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const result = await updateUserProfile(userId, updates);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// ============= FRIENDS MANAGEMENT API ROUTES =============

// Get user's friends
app.get('/api/users/:userId/friends', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserFriends(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Add friend
app.post('/api/users/:userId/friends', async (req, res) => {
  try {
    const { userId } = req.params;
    const { friend_id } = req.body;
    
    if (!friend_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Friend ID is required' 
      });
    }

    const result = await addFriend(userId, friend_id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Remove friend
app.delete('/api/users/:userId/friends/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    const result = await removeFriend(userId, friendId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get recommended friends
app.get('/api/users/:userId/recommended', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const result = await getRecommendedFriends(userId, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Check if users are friends
app.get('/api/users/:userId/friends/:friendId/status', async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    const result = await areFriends(userId, friendId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// ============= GROUP MANAGEMENT API ROUTES =============

// Create group
app.post('/api/groups', async (req, res) => {
  try {
    const { group_name, group_description, created_by } = req.body;
    
    if (!group_name || !created_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group name and creator ID are required' 
      });
    }

    const result = await createGroup({ group_name, group_description, created_by });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get group by ID
app.get('/api/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await getGroupById(groupId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get user's groups
app.get('/api/users/:userId/groups', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserGroups(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Add member to group
app.post('/api/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { user_id, added_by, role = 'member' } = req.body;
    
    if (!user_id || !added_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and added_by are required' 
      });
    }

    const result = await addGroupMember(groupId, user_id, added_by, role);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Remove member from group
app.delete('/api/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { removed_by } = req.body;
    
    if (!removed_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'removed_by is required' 
      });
    }

    const result = await removeGroupMember(groupId, userId, removed_by);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Update group
app.put('/api/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { updated_by, ...updates } = req.body;
    
    if (!updated_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'updated_by is required' 
      });
    }

    const result = await updateGroup(groupId, updates, updated_by);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Leave group
app.post('/api/groups/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const result = await leaveGroup(groupId, user_id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// ============= MESSAGES API ROUTES (Local Storage) =============

// Get messages for direct chat or group
app.get('/api/messages/:chatId', (req, res) => {
  const { chatId } = req.params;
  const chatMessages = getMessages(chatId);
  res.json({ success: true, messages: chatMessages });
});

// ============= WEBSOCKET CONNECTION HANDLING =============

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user connection with user info
  socket.on('user_connected', async (userData) => {
    try {
      const { user_id, user_name, phone_number } = userData;
      let user;

      if (user_id) {
        // Existing user reconnecting
        const result = await getUserById(user_id);
        if (result.success) {
          user = result.data;
          await updateUserOnlineStatus(user_id, true);
        } else {
          socket.emit('error', { message: 'User not found' });
          return;
        }
      } else if (user_name && phone_number) {
        // New user registration
        const result = await registerUser({ user_name, phone_number });
        if (result.success) {
          user = result.data;
          await updateUserOnlineStatus(user.user_id, true);
        } else {
          socket.emit('error', { message: result.message });
          return;
        }
      } else {
        socket.emit('error', { message: 'User ID or username and phone number are required' });
        return;
      }

      // Store active user
      activeUsers.set(socket.id, {
        ...user,
        socketId: socket.id
      });
      socket.user_id = user.user_id;

      // Get user's friends and groups
      const friendsResult = await getUserFriends(user.user_id);
      const groupsResult = await getUserGroups(user.user_id);

      // Emit successful connection
      socket.emit('user_connected_success', {
        user: user,
        friends: friendsResult.success ? friendsResult.data : [],
        groups: groupsResult.success ? groupsResult.data : [],
        message: 'Connected successfully'
      });

      // Notify friends about online status
      if (friendsResult.success) {
        friendsResult.data.forEach(friend => {
          // Find friend's socket and notify
          for (const [socketId, activeUser] of activeUsers.entries()) {
            if (activeUser.user_id === friend.user_id) {
              io.to(socketId).emit('friend_status_changed', {
                user_id: user.user_id,
                user_name: user.user_name,
                online: true,
                last_seen: user.last_seen
              });
              break;
            }
          }
        });
      }

      console.log(`User ${user.user_name} (${user.user_id}) connected with socket ${socket.id}`);

    } catch (error) {
      console.error('Error in user_connected:', error);
      socket.emit('error', { message: 'Connection failed' });
    }
  });

  // Handle joining a direct chat or group chat
  socket.on('join_chat', async (data) => {
    try {
      const { chat_id, chat_type } = data; // chat_type: 'direct' or 'group'
      
      if (!socket.user_id) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Join the socket room
      socket.join(chat_id);

      // Get chat messages (from local storage backup or empty array)
      const chatMessages = getMessages(chat_id);

      // Emit successful join
      socket.emit('chat_joined', {
        chat_id,
        chat_type,
        messages: chatMessages,
        message: `Joined ${chat_type} chat`
      });

      // Notify other users in the chat
      socket.to(chat_id).emit('user_joined_chat', {
        user_id: socket.user_id,
        chat_id,
        chat_type,
        message: `User joined the ${chat_type} chat`
      });

      console.log(`User ${socket.user_id} joined ${chat_type} chat ${chat_id}`);

    } catch (error) {
      console.error('Error in join_chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Handle leaving a chat
  socket.on('leave_chat', (data) => {
    const { chat_id, chat_type } = data;
    
    // Leave the socket room
    socket.leave(chat_id);

    // Emit successful leave
    socket.emit('chat_left', {
      chat_id,
      chat_type,
      message: `Left ${chat_type} chat`
    });

    // Notify other users in the chat
    socket.to(chat_id).emit('user_left_chat', {
      user_id: socket.user_id,
      chat_id,
      chat_type,
      message: `User left the ${chat_type} chat`
    });

    console.log(`User ${socket.user_id} left ${chat_type} chat ${chat_id}`);
  });

  // Handle sending messages (modified to work with local storage)
  socket.on('send_message', (messageData) => {
    if (!socket.user_id) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    // Add user_id to message data
    messageData.user_id = socket.user_id;
    
    // Get user data for the message
    const userData = activeUsers.get(socket.id);
    if (userData) {
      messageData.user_name = userData.user_name;
    }

    handleSendMessage(socket, messageData, messages, null, io);
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      socket.to(data.chat_id).emit('user_typing', {
        user_id: userData.user_id,
        user_name: userData.user_name,
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', (data) => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      socket.to(data.chat_id).emit('user_typing', {
        user_id: userData.user_id,
        user_name: userData.user_name,
        isTyping: false
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.user_id) {
      // Update user status to offline
      await updateUserOnlineStatus(socket.user_id, false);
      
      // Get user data before removing
      const userData = activeUsers.get(socket.id);
      
      // Remove from active users
      activeUsers.delete(socket.id);
      
      // Notify friends about offline status
      if (userData) {
        const friendsResult = await getUserFriends(userData.user_id);
        if (friendsResult.success) {
          friendsResult.data.forEach(friend => {
            // Find friend's socket and notify
            for (const [socketId, activeUser] of activeUsers.entries()) {
              if (activeUser.user_id === friend.user_id) {
                io.to(socketId).emit('friend_status_changed', {
                  user_id: userData.user_id,
                  user_name: userData.user_name,
                  online: false,
                  last_seen: new Date().toISOString()
                });
                break;
              }
            }
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3090;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables`);
});