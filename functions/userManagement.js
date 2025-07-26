import { users } from '../server.js';

// Generate unique user ID
export const generateUserId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Register new user with phone number
export const registerUser = (userData) => {
  const { user_name, phone_number } = userData;
  
  if (!user_name || !phone_number) {
    throw new Error('Username and phone number are required');
  }

  // Check if phone number already exists
  for (const [userId, user] of users.entries()) {
    if (user.phone_number === phone_number) {
      throw new Error('Phone number already registered');
    }
  }

  const user_id = generateUserId();
  const currentTime = new Date().toISOString();

  const user = {
    user_id,
    user_name: user_name.trim(),
    phone_number: phone_number.trim(),
    created_at: currentTime,
    last_seen: currentTime,
    online: false,
    friends: [], // Array of friend user IDs
    groups: [], // Array of group IDs user belongs to
    profile_picture: null,
    status: "Available"
  };

  users.set(user_id, user);
  console.log(`User registered: ${user_name} (${user_id})`);
  
  return user;
};

// Update user connection status
export const handleUserConnection = (socket, userData, users, io) => {
  const { user_id, user_name, phone_number } = userData;
  
  let user;
  
  if (user_id && users.has(user_id)) {
    // Existing user reconnecting
    user = users.get(user_id);
    user.online = true;
    user.last_seen = new Date().toISOString();
    user.socketId = socket.id;
  } else if (user_name && phone_number) {
    // New user registration
    try {
      user = registerUser({ user_name, phone_number });
      user.online = true;
      user.socketId = socket.id;
    } catch (error) {
      socket.emit('error', { message: error.message });
      return;
    }
  } else {
    socket.emit('error', { message: 'User ID or username and phone number are required' });
    return;
  }

  users.set(user.user_id, user);
  socket.user_id = user.user_id;

  // Emit successful connection
  socket.emit('user_connected_success', {
    user_id: user.user_id,
    user_name: user.user_name,
    phone_number: user.phone_number,
    friends: user.friends,
    groups: user.groups,
    message: 'Connected successfully'
  });

  // Notify friends about online status
  notifyFriendsOnlineStatus(user.user_id, true, io);

  console.log(`User ${user.user_name} (${user.user_id}) connected with socket ${socket.id}`);
};

// Handle user disconnection
export const handleUserDisconnection = (socket, users, io) => {
  if (socket.user_id && users.has(socket.user_id)) {
    const user = users.get(socket.user_id);
    user.online = false;
    user.last_seen = new Date().toISOString();
    user.socketId = null;
    users.set(socket.user_id, user);

    // Notify friends about offline status
    notifyFriendsOnlineStatus(socket.user_id, false, io);

    console.log(`User ${user.user_name} (${socket.user_id}) disconnected`);
  }
};

// Add friend
export const addFriend = (userId, friendId) => {
  if (!users.has(userId) || !users.has(friendId)) {
    throw new Error('User or friend not found');
  }

  if (userId === friendId) {
    throw new Error('Cannot add yourself as friend');
  }

  const user = users.get(userId);
  const friend = users.get(friendId);

  // Check if already friends
  if (user.friends.includes(friendId)) {
    throw new Error('Already friends');
  }

  // Add to both users' friends lists
  user.friends.push(friendId);
  friend.friends.push(userId);

  users.set(userId, user);
  users.set(friendId, friend);

  console.log(`${user.user_name} and ${friend.user_name} are now friends`);
  
  return {
    user: {
      user_id: friend.user_id,
      user_name: friend.user_name,
      phone_number: friend.phone_number,
      online: friend.online,
      last_seen: friend.last_seen
    }
  };
};

// Remove friend
export const removeFriend = (userId, friendId) => {
  if (!users.has(userId) || !users.has(friendId)) {
    throw new Error('User or friend not found');
  }

  const user = users.get(userId);
  const friend = users.get(friendId);

  // Remove from both users' friends lists
  user.friends = user.friends.filter(id => id !== friendId);
  friend.friends = friend.friends.filter(id => id !== userId);

  users.set(userId, user);
  users.set(friendId, friend);

  console.log(`${user.user_name} and ${friend.user_name} are no longer friends`);
  
  return { success: true };
};

// Get user's friends list
export const getUserFriends = (userId) => {
  if (!users.has(userId)) {
    throw new Error('User not found');
  }

  const user = users.get(userId);
  const friendsList = user.friends.map(friendId => {
    const friend = users.get(friendId);
    return friend ? {
      user_id: friend.user_id,
      user_name: friend.user_name,
      phone_number: friend.phone_number,
      online: friend.online,
      last_seen: friend.last_seen,
      profile_picture: friend.profile_picture,
      status: friend.status
    } : null;
  }).filter(Boolean);

  return friendsList;
};

// Get recommended friends (10 random users excluding current friends)
export const getRecommendedFriends = (userId) => {
  if (!users.has(userId)) {
    throw new Error('User not found');
  }

  const user = users.get(userId);
  const excludeIds = [userId, ...user.friends];
  
  const availableUsers = [];
  for (const [id, userData] of users.entries()) {
    if (!excludeIds.includes(id)) {
      availableUsers.push({
        user_id: userData.user_id,
        user_name: userData.user_name,
        phone_number: userData.phone_number,
        online: userData.online,
        last_seen: userData.last_seen,
        profile_picture: userData.profile_picture,
        status: userData.status
      });
    }
  }

  // Shuffle and return up to 10 users
  const shuffled = availableUsers.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 10);
};

// Search users by name or phone number
export const searchUsers = (query, excludeUserId = null) => {
  const results = [];
  const searchTerm = query.toLowerCase();

  for (const [id, user] of users.entries()) {
    if (excludeUserId && id === excludeUserId) continue;
    
    if (user.user_name.toLowerCase().includes(searchTerm) || 
        user.phone_number.includes(searchTerm)) {
      results.push({
        user_id: user.user_id,
        user_name: user.user_name,
        phone_number: user.phone_number,
        online: user.online,
        last_seen: user.last_seen,
        profile_picture: user.profile_picture,
        status: user.status
      });
    }
  }

  return results;
};

// Notify friends about online status change
const notifyFriendsOnlineStatus = (userId, online, io) => {
  if (!users.has(userId)) return;

  const user = users.get(userId);
  
  user.friends.forEach(friendId => {
    const friend = users.get(friendId);
    if (friend && friend.online && friend.socketId) {
      io.to(friend.socketId).emit('friend_status_changed', {
        user_id: userId,
        user_name: user.user_name,
        online: online,
        last_seen: user.last_seen
      });
    }
  });
};

// Get user by phone number
export const getUserByPhone = (phoneNumber) => {
  for (const [id, user] of users.entries()) {
    if (user.phone_number === phoneNumber) {
      return {
        user_id: user.user_id,
        user_name: user.user_name,
        phone_number: user.phone_number,
        online: user.online,
        last_seen: user.last_seen,
        profile_picture: user.profile_picture,
        status: user.status
      };
    }
  }
  return null;
};