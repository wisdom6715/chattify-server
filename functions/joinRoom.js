export const handleJoinRoom = (socket, data, rooms, users, io) => {
    const { roomId, userId, username } = data;
  
    if (!roomId || !userId || !username) {
      socket.emit('error', { message: 'Room ID, user ID, and username are required' });
      return;
    }
  
    // Check if room exists
    let room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
  
    // Check if user exists
    const user = users.get(userId);
    if (!user) {
      socket.emit('error', { message: 'User not found' });
      return;
    }
  
    // Join the socket room
    socket.join(roomId);
  
    // Add user to room participants if not already present
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      rooms.set(roomId, room);
    }
  
    // Get room messages
    const roomMessages = room.messages || [];
  
    // Emit successful join
    socket.emit('room_joined', {
      roomId,
      roomName: room.name,
      participants: room.participants,
      messages: roomMessages,
      message: `Joined room: ${room.name}`
    });
  
    // Notify other users in the room
    socket.to(roomId).emit('user_joined_room', {
      userId,
      username,
      roomId,
      roomName: room.name,
      message: `${username} joined the room`
    });
  
    // Send current participants list to the user
    const participantDetails = room.participants.map(participantId => {
      const participant = users.get(participantId);
      return participant ? {
        id: participant.id,
        username: participant.username,
        online: participant.online
      } : null;
    }).filter(Boolean);
  
    socket.emit('room_participants', {
      roomId,
      participants: participantDetails
    });
  
    console.log(`User ${username} joined room ${room.name}`);
  };