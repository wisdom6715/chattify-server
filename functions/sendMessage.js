export const handleSendMessage = (socket, messageData, messages, rooms, io) => {
    const { roomId, message, userId, username } = messageData;
  
    if (!roomId || !message || !userId || !username) {
      socket.emit('error', { message: 'Room ID, message, user ID, and username are required' });
      return;
    }
  
    // Check if room exists
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
  
    // Check if user is in the room
    if (!room.participants.includes(userId)) {
      socket.emit('error', { message: 'User not in this room' });
      return;
    }
  
    // Create message object
    const messageObj = {
      id: Date.now().toString(),
      roomId,
      userId,
      username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };
  
    // Store message (get existing messages or create new array)
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }
    const roomMessages = messages.get(roomId);
    roomMessages.push(messageObj);
    
    // Keep only last 1000 messages per room (memory optimization)
    if (roomMessages.length > 1000) {
      roomMessages.shift();
    }
  
    // Update room's last message and activity
    room.lastMessage = {
      text: message.trim(),
      timestamp: messageObj.timestamp,
      sender: username
    };
    room.lastActivity = messageObj.timestamp;
    rooms.set(roomId, room);
  
    // Emit message to all users in the room
    io.to(roomId).emit('new_message', messageObj);
  
    // Emit message confirmation to sender
    socket.emit('message_sent', {
      messageId: messageObj.id,
      timestamp: messageObj.timestamp
    });
  
    console.log(`Message sent in room ${roomId} by ${username}: ${message.substring(0, 50)}...`);
  };